import { prisma } from '../../shared/prisma';
import { adminRepository } from './admin.repository';
import {
  assertTransition, DISPUTE_TRANSITIONS, ACCOUNT_TRANSITIONS, KYC_TRANSITIONS,
} from '../../shared/stateMachines';
import { ConflictError, NotFoundError, ValidationError } from '../../shared/errors';
import { events } from '../../shared/events';
import { signPurposeToken } from '../../shared/purposeTokens';
import { signAccessToken } from '../../shared/accessTokens';
import { sendMail, renderTemplate } from '../../shared/mailer';
import type {
  ResolveDisputeInput, EscalateDisputeInput, ModerateUserInput,
  ApproveKycInput, RejectKycInput, RequestKycInfoInput, ImpersonateInput,
} from './admin.schema';

async function getAdminOrThrow(userId: string) {
  const admin = await prisma.adminProfile.findUnique({ where: { userId } });
  if (!admin) throw new NotFoundError('Admin profile');
  return admin;
}

/** WARN and UNBAN don't necessarily flip AccountStatus the same way SUSPEND/
 * BAN do — WARN never changes status at all (it's a logged notice), UNBAN
 * always returns to ACTIVE regardless of which locked state it came from. */
function targetStatusFor(action: ModerateUserInput['action']): 'ACTIVE' | 'SUSPENDED' | 'BANNED' | null {
  switch (action) {
    case 'SUSPEND': return 'SUSPENDED';
    case 'BAN': return 'BANNED';
    case 'UNBAN': return 'ACTIVE';
    case 'WARN': return null;
  }
}

export const adminService = {
  // ══════════════════════════════════ DISPUTES ═══════════════════════════

  listDisputes(status?: string) {
    return adminRepository.findDisputes(status);
  },

  async getDisputeDetail(id: string) {
    const dispute = await adminRepository.findDisputeDetail(id);
    if (!dispute) throw new NotFoundError('Dispute');
    const chatTranscript = await adminRepository.findChatTranscriptForContract(dispute.milestone.contractId);
    return { ...dispute, chatTranscript };
  },

  async assignDispute(userId: string, disputeId: string) {
    const admin = await getAdminOrThrow(userId);
    const dispute = await adminRepository.findDisputeDetail(disputeId);
    if (!dispute) throw new NotFoundError('Dispute');
    assertTransition(DISPUTE_TRANSITIONS, dispute.status, 'UNDER_REVIEW', 'dispute');
    return adminRepository.assignDispute(disputeId, admin.id);
  },

  async escalateDispute(disputeId: string, input: EscalateDisputeInput) {
    const dispute = await adminRepository.findDisputeDetail(disputeId);
    if (!dispute) throw new NotFoundError('Dispute');
    assertTransition(DISPUTE_TRANSITIONS, dispute.status, 'ESCALATED', 'dispute');
    return adminRepository.escalateDispute(disputeId, input.escalationReason);
  },

  async resolveDispute(disputeId: string, input: ResolveDisputeInput) {
    const dispute = await adminRepository.findDisputeDetail(disputeId);
    if (!dispute) throw new NotFoundError('Dispute');
    assertTransition(DISPUTE_TRANSITIONS, dispute.status, 'RESOLVED', 'dispute');

    const escrow = dispute.milestone.escrow;
    if (!escrow) throw new ConflictError('This milestone has no associated escrow to resolve');

    // Pre-check gives a clean 422 before hitting the DB's
    // ck_dispute_resolution_amounts CHECK constraint, which is the real guard.
    const total = input.amountToFreelancer + input.amountToClient;
    const escrowAmount = Number(escrow.amount);
    if (Math.abs(total - escrowAmount) > 0.01) {
      throw new ValidationError(
        `Split must sum to the frozen escrow amount (${escrowAmount}), got ${total}`,
      );
    }

    const freelancerUserId = dispute.milestone.contract.freelancer.userId;

    const result = await adminRepository.resolve({
      disputeId, milestoneId: dispute.milestoneId, contractId: dispute.milestone.contractId,
      freelancerUserId, escrowId: escrow.id, escrowAmount: escrow.amount,
      amountToFreelancer: input.amountToFreelancer, amountToClient: input.amountToClient,
      resolutionNote: input.resolutionNote,
    });

    events.emit('DisputeResolved', { disputeId, contractId: dispute.milestone.contractId });
    return result;
  },

  // ══════════════════════════════════ USERS ══════════════════════════════

  listUsers(page: number, limit: number) {
    return adminRepository.findUsers(page, limit);
  },

  async getUserDetail(id: string) {
    const user = await adminRepository.findUserDetail(id);
    if (!user) throw new NotFoundError('User');
    const activity = await adminRepository.countActivityForUser(id, user.role);
    return { ...user, activity };
  },

  async moderateUser(adminUserId: string, targetUserId: string, input: ModerateUserInput) {
    const admin = await getAdminOrThrow(adminUserId);
    const target = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target) throw new NotFoundError('User');

    const newStatus = targetStatusFor(input.action);
    if (newStatus && newStatus !== target.accountStatus) {
      assertTransition(ACCOUNT_TRANSITIONS, target.accountStatus, newStatus, 'account');
      await adminRepository.updateAccountStatus(targetUserId, newStatus);
    }

    const action = await adminRepository.createModerationAction({
      targetUserId, adminId: admin.id, action: input.action, reason: input.reason,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
    });
    events.emit('UserModerated', { userId: targetUserId, action: input.action });
    return action;
  },

  // ══════════════════════════════════ VERIFICATIONS (KYC) ════════════════
  //
  // NOTE: this module only manages the admin-side queue (list/approve/
  // reject/request-info) against EXISTING KycSubmission rows. The
  // recruiter-side action of actually submitting KYC documents — which
  // creates those rows in the first place — is not part of this pass; the
  // queue will stay empty until that submission endpoint is built (likely
  // as an addition to the profiles or a dedicated verification module).

  listKycSubmissions(status?: string) {
    return adminRepository.findKycSubmissions(status);
  },

  async approveKyc(adminUserId: string, id: string, _input: ApproveKycInput) {
    const submission = await adminRepository.findKycSubmissionById(id);
    if (!submission) throw new NotFoundError('Verification request');
    assertTransition(KYC_TRANSITIONS, submission.status, 'APPROVED', 'kyc');
    return adminRepository.approveKyc(id, submission.recruiterId, adminUserId);
  },

  async rejectKyc(adminUserId: string, id: string, input: RejectKycInput) {
    const submission = await adminRepository.findKycSubmissionById(id);
    if (!submission) throw new NotFoundError('Verification request');

    // A second rejection for the same recruiter routes to MANUAL_REVIEW
    // rather than back to the standard PENDING queue — higher scrutiny on
    // repeat attempts, per the original verification-queue design.
    const priorRejections = await adminRepository.countPriorRejections(submission.recruiterId);
    const routeToManualReview = priorRejections > 0;

    assertTransition(KYC_TRANSITIONS, submission.status, routeToManualReview ? 'MANUAL_REVIEW' : 'REJECTED', 'kyc');
    const reasonText = [input.reason, input.note].filter(Boolean).join(' — ');
    return adminRepository.rejectKyc(id, submission.recruiterId, adminUserId, reasonText, routeToManualReview);
  },

  async requestKycInfo(id: string, input: RequestKycInfoInput) {
    const submission = await adminRepository.findKycSubmissionById(id);
    if (!submission) throw new NotFoundError('Verification request');
    // Status stays PENDING — this isn't a rejection, just a request for more
    // detail, so it deliberately skips the state-machine transition entirely.
    return adminRepository.requestKycInfo(id, input.message);
  },

  // ══════════════════════════════════ PASSWORD RESET ═════════════════════

  /** Uses the exact same purpose-token mechanism a self-service reset would
   * (shared/purposeTokens.ts) — the target user gets a real, working reset
   * link, just triggered by an admin instead of the "forgot password" form. */
  async resetUserPassword(targetUserId: string) {
    const user = await adminRepository.findUserForReset(targetUserId);
    if (!user) throw new NotFoundError('User');

    const resetToken = signPurposeToken(user.id, 'reset-password');
    await sendMail({
      to: user.email,
      subject: 'Your password has been reset by an administrator',
      body: renderTemplate(
        'Hi {{fullName}}, an administrator has triggered a password reset on your account. Use this link to set a new password: {{link}}',
        { fullName: user.fullName, link: `(reset link embeds token: ${resetToken})` },
      ),
    });
    return { ok: true };
  },

  // ══════════════════════════════════ IMPERSONATION ═══════════════════════
  //
  // OQ-12 deferred this in the earlier pass pending exactly this design:
  // a required reason (audit-logged, never silent), a short-lived token
  // (30 min, not the normal session length), and blockDuringImpersonation
  // applied to every money-moving or moderation route so an impersonation
  // session cannot be used to drain a wallet or ban a user on someone else's
  // behalf. There is no explicit "end impersonation" event in this stateless
  // JWT model — the short TTL is the safety net for that, not a full session
  // registry (a real production system would likely want the latter too).

  async impersonate(adminUserId: string, targetUserId: string, input: ImpersonateInput) {
    const target = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target) throw new NotFoundError('User');
    if (target.role === 'ADMIN') {
      throw new ValidationError('Cannot impersonate another admin');
    }

    await adminRepository.logImpersonationStart(adminUserId, targetUserId, input.reason);

    const impersonationToken = signAccessToken(
      target.id, target.role, { impersonating: true, actualAdminId: adminUserId }, '30m',
    );
    return { accessToken: impersonationToken, expiresIn: '30m', impersonatingUser: { id: target.id, fullName: target.fullName, role: target.role } };
  },
};
