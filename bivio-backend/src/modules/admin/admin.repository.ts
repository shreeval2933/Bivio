import { prisma } from '../../shared/prisma';
import { Prisma } from '@prisma/client';

export const adminRepository = {
  // ── Disputes ──────────────────────────────────────────────────────────
  findDisputes(status?: string) {
    return prisma.dispute.findMany({
      where: status ? { status: status as never } : undefined,
      include: {
        raisedBy: true,
        assignedAdmin: { include: { user: true } },
        milestone: { include: { contract: { include: { job: true } } } },
      },
      orderBy: { createdAt: 'asc' }, // oldest first — fairness
    });
  },

  findDisputeDetail(id: string) {
    return prisma.dispute.findUnique({
      where: { id },
      include: {
        raisedBy: true,
        assignedAdmin: { include: { user: true } },
        milestone: {
          include: {
            contract: { include: { job: true, client: { include: { user: true } }, freelancer: { include: { user: true } } } },
            escrow: true,
            submissions: { orderBy: { versionNo: 'asc' } },
          },
        },
      },
    });
  },

  async findChatTranscriptForContract(contractId: string) {
    const room = await prisma.chatRoom.findUnique({ where: { contractId } });
    if (!room) return [];
    return prisma.message.findMany({
      where: { roomId: room.id }, include: { sender: true }, orderBy: { sentAt: 'asc' },
    });
  },

  assignDispute(id: string, adminId: string) {
    return prisma.dispute.update({ where: { id }, data: { status: 'UNDER_REVIEW', assignedAdminId: adminId } });
  },

  escalateDispute(id: string, reason: string) {
    return prisma.dispute.update({ where: { id }, data: { status: 'ESCALATED', escalationReason: reason } });
  },

  /**
   * The dispute resolution transaction — records the split, credits the
   * freelancer's wallet under a row lock for their share (same pattern as
   * the milestone-approval transaction), and resolves the escrow/milestone/
   * contract states together. The client's share is recorded on the dispute
   * itself; actually refunding it requires a real payment-gateway refund
   * flow, which isn't built yet — see the service-layer comment.
   */
  async resolve(params: {
    disputeId: string; milestoneId: string; contractId: string; freelancerUserId: string;
    escrowId: string; escrowAmount: Prisma.Decimal;
    amountToFreelancer: number; amountToClient: number; resolutionNote: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const dispute = await tx.dispute.update({
        where: { id: params.disputeId },
        data: {
          status: 'RESOLVED', resolutionNote: params.resolutionNote, resolvedAt: new Date(),
          amountToFreelancer: params.amountToFreelancer, amountToClient: params.amountToClient,
        },
      });

      if (params.amountToFreelancer > 0) {
        const [wallet] = await tx.$queryRaw<Array<{ id: string; available_balance: Prisma.Decimal }>>`
          SELECT * FROM wallets WHERE user_id = ${params.freelancerUserId}::uuid FOR UPDATE
        `;
        if (wallet) {
          const newBalance = new Prisma.Decimal(wallet.available_balance).add(params.amountToFreelancer);
          await tx.wallet.update({ where: { id: wallet.id }, data: { availableBalance: newBalance } });
          await tx.transaction.create({
            data: {
              walletId: wallet.id, direction: 'CREDIT', amount: params.amountToFreelancer, balanceAfter: newBalance,
              referenceType: 'DISPUTE', referenceId: params.disputeId,
              description: 'Dispute resolution — partial or full milestone credit',
            },
          });
        }
      }

      // Full refund to client (nothing to the freelancer) -> escrow refunded,
      // milestone returns to PENDING so the contract can continue or be
      // re-attempted. Any amount to the freelancer -> escrow released,
      // milestone goes straight to PAID (the state machine allows
      // DISPUTED -> PAID directly for exactly this "admin splits funds" case).
      const escrowStatus = params.amountToFreelancer > 0 ? 'RELEASED' : 'REFUNDED';
      const milestoneStatus = params.amountToFreelancer > 0 ? 'PAID' : 'PENDING';

      await tx.escrow.update({
        where: { id: params.escrowId },
        data: { status: escrowStatus, releasedAt: escrowStatus === 'RELEASED' ? new Date() : undefined },
      });
      await tx.milestone.update({ where: { id: params.milestoneId }, data: { status: milestoneStatus } });
      // Dispute is a detour, not an ending — the contract returns to ACTIVE.
      await tx.contract.update({ where: { id: params.contractId }, data: { status: 'ACTIVE' } });

      return dispute;
    });
  },

  // ── Users ─────────────────────────────────────────────────────────────
  findUsers(page: number, limit: number) {
    const skip = (page - 1) * limit;
    return Promise.all([
      prisma.user.findMany({
        take: limit,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          recruiterProfile: {
            include: {
              company: true,
              kycSubmissions: { orderBy: { createdAt: 'desc' }, take: 1 },
            },
          },
          candidateProfile: true,
          _count: {
            select: {
              moderationsRecvd: true,
              disputesRaised: true,
            },
          },
        },
      }),
      prisma.user.count(),
    ]);
  },

  findUserDetail(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        candidateProfile: {
          include: {
            portfolio: { include: { projects: true } },
            skills: { include: { skill: true } },
          },
        },
        recruiterProfile: {
          include: {
            company: true,
            kycSubmissions: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
        wallet: true,
        moderationsRecvd: {
          include: {
            admin: { include: { user: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        disputesRaised: true,
      },
    });
  },

  async countActivityForUser(userId: string, role: string) {
    if (role === 'CANDIDATE') {
      const candidate = await prisma.candidateProfile.findUnique({ where: { userId } });
      if (!candidate) return { applications: 0, proposals: 0, contracts: 0 };
      const [applications, proposals, contracts] = await Promise.all([
        prisma.application.count({ where: { candidateId: candidate.id } }),
        prisma.proposal.count({ where: { candidateId: candidate.id } }),
        prisma.contract.count({ where: { freelancerId: candidate.id } }),
      ]);
      return { applications, proposals, contracts };
    }
    if (role === 'RECRUITER') {
      const recruiter = await prisma.recruiterProfile.findUnique({ where: { userId } });
      if (!recruiter) return { jobsPosted: 0, contracts: 0 };
      const [jobsPosted, contracts] = await Promise.all([
        prisma.job.count({ where: { recruiterId: recruiter.id } }),
        prisma.contract.count({ where: { clientId: recruiter.id } }),
      ]);
      return { jobsPosted, contracts };
    }
    return {};
  },

  createModerationAction(data: { targetUserId: string; adminId: string; action: string; reason: string; expiresAt?: Date }) {
    return prisma.moderationAction.create({ data: data as never });
  },

  updateAccountStatus(userId: string, accountStatus: string) {
    return prisma.user.update({ where: { id: userId }, data: { accountStatus: accountStatus as never } });
  },

  // ── Verifications (KYC) ──────────────────────────────────────────────────
  async findKycSubmissions(status?: string) {
    const submissions = await prisma.kycSubmission.findMany({
      where: status ? { status: status as never } : undefined,
      include: { recruiter: { include: { user: true, company: true } } },
      orderBy: { createdAt: 'asc' },
    });

    const submissionIds = submissions.map(s => s.id);
    const attachments = await prisma.attachment.findMany({
      where: { ownerType: 'KYC_SUBMISSION', ownerId: { in: submissionIds } },
    });

    return submissions.map(s => ({
      ...s,
      documents: attachments
        .filter(a => a.ownerId === s.id)
        .map(a => ({ name: a.fileName, url: a.fileUrl })),
    }));
  },

  findKycSubmissionById(id: string) {
    return prisma.kycSubmission.findUnique({ where: { id }, include: { recruiter: { include: { user: true } } } });
  },

  approveKyc(id: string, recruiterId: string, adminUserId: string) {
    return prisma.$transaction([
      prisma.kycSubmission.update({
        where: { id }, data: { status: 'APPROVED', reviewedByAdminId: adminUserId, reviewedAt: new Date() },
      }),
      prisma.recruiterProfile.update({
        where: { id: recruiterId }, data: { idVerified: true, idVerifiedAt: new Date(), kycStatus: 'APPROVED' },
      }),
    ]);
  },

  rejectKyc(id: string, recruiterId: string, adminUserId: string, reason: string, routeToManualReview: boolean) {
    const nextStatus = routeToManualReview ? 'MANUAL_REVIEW' : 'REJECTED';
    return prisma.$transaction([
      prisma.kycSubmission.update({
        where: { id },
        data: { status: nextStatus, rejectionReason: reason, reviewedByAdminId: adminUserId, reviewedAt: new Date() },
      }),
      prisma.recruiterProfile.update({ where: { id: recruiterId }, data: { kycStatus: nextStatus } }),
    ]);
  },

  requestKycInfo(id: string, message: string) {
    return prisma.kycSubmission.update({ where: { id }, data: { clarificationRequested: message } });
  },

  countPriorRejections(recruiterId: string) {
    return prisma.kycSubmission.count({ where: { recruiterId, status: 'REJECTED' } });
  },

  // ── Password reset & impersonation ────────────────────────────────────
  findUserForReset(userId: string) {
    return prisma.user.findUnique({ where: { id: userId } });
  },

  logImpersonationStart(actorAdminUserId: string, targetUserId: string, reason: string) {
    return prisma.auditLog.create({
      data: {
        actorUserId: actorAdminUserId,
        entityType: 'User',
        entityId: targetUserId,
        action: 'IMPERSONATION_START',
        diff: { reason },
      },
    });
  },
};
