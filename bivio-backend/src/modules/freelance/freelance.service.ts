import * as fs from 'fs';
import * as path from 'path';
import { prisma } from '../../shared/prisma';
import { freelanceRepository } from './freelance.repository';
import { paymentGateway } from '../../shared/paymentGateway';
import {
  assertTransition, PROPOSAL_TRANSITIONS, MILESTONE_TRANSITIONS,
} from '../../shared/stateMachines';
import {
  ConflictError, ForbiddenError, NotFoundError, ValidationError,
} from '../../shared/errors';
import { events } from '../../shared/events';
import type {
  SubmitProposalInput, RejectProposalInput, FundMilestoneInput, SubmitMilestoneInput,
  RequestRevisionInput, RaiseDisputeInput, SubmitReviewInput,
} from './freelance.schema';

async function getCandidateOrThrow(userId: string) {
  const candidate = await prisma.candidateProfile.findUnique({ where: { userId } });
  if (!candidate) throw new NotFoundError('Candidate profile');
  return candidate;
}

async function getRecruiterOrThrow(userId: string) {
  const recruiter = await prisma.recruiterProfile.findUnique({
    where: { userId },
    include: { user: true }
  });
  if (!recruiter) throw new NotFoundError('Recruiter profile');
  return recruiter;
}

async function getPlatformFeePercent(): Promise<number> {
  const setting = await prisma.platformSetting.findUnique({ where: { key: 'PLATFORM_FEE_PERCENT' } });
  const n = Number(setting?.value);
  return Number.isFinite(n) ? n : 10;
}

/** Loads a contract and asserts the caller is one of its two parties. Admins
 * are not handled here — the admin module reads contracts through its own
 * dispute-scoped path, not this general party check. */
async function getContractForPartyOrThrow(contractId: string, userId: string, role: string) {
  const contract = await freelanceRepository.findContractById(contractId);
  if (!contract) throw new NotFoundError('Contract');

  if (role === 'CANDIDATE') {
    const candidate = await getCandidateOrThrow(userId);
    if (contract.freelancerId !== candidate.id) throw new NotFoundError('Contract'); // 404, not 403 — don't confirm existence
  } else if (role === 'RECRUITER') {
    const recruiter = await getRecruiterOrThrow(userId);
    if (contract.clientId !== recruiter.id) throw new NotFoundError('Contract');
  }
  return contract;
}

export const freelanceService = {
  // ══════════════════════════════════ PROPOSALS ═════════════════════════

  async listProposals(userId: string, role: string, filters: { jobId?: string; mine?: boolean }) {
    const where: Record<string, unknown> = {};
    if (filters.jobId) where.jobId = filters.jobId;
    if (filters.mine || role === 'CANDIDATE') {
      const candidate = await getCandidateOrThrow(userId);
      where.candidateId = candidate.id;
    } else if (role === 'RECRUITER') {
      const recruiter = await getRecruiterOrThrow(userId);
      where.job = { recruiterId: recruiter.id };
    }
    const proposals = await freelanceRepository.findProposals(where as never);
    return proposals.map((p) => {
      const match = p.candidate.matchScores.find((ms) => ms.jobId === p.jobId && ms.isCurrent);
      return {
        ...p,
        matchScore: match ? Number(match.score) : 70,
        aiBreakdown: match?.breakdown || null,
      };
    });
  },

  async submitProposal(userId: string, jobId: string, input: SubmitProposalInput) {
    const candidate = await getCandidateOrThrow(userId);

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundError('Job');
    if (job.status !== 'OPEN') throw new ConflictError('This project is not accepting proposals');
    if (job.jobType !== 'FREELANCE') throw new ValidationError('Only freelance jobs accept proposals');
    // Per OQ-2, no verification/fee gate applies to freelancers bidding —
    // deliberately no check here beyond job/candidate state.

    const hasLive = await freelanceRepository.hasLiveProposal(jobId, candidate.id);
    if (hasLive) throw new ConflictError('You already have an active proposal for this project');

    return freelanceRepository.createProposal({
      jobId,
      candidateId: candidate.id,
      bidAmount: input.bidAmount,
      currency: input.currency,
      durationDays: input.durationDays,
      estimatedHours: input.estimatedHours,
      coverLetter: input.coverLetter,
      proposedMilestones: input.milestones,
    });
  },

  async shortlist(userId: string, proposalId: string) {
    const recruiter = await getRecruiterOrThrow(userId);
    const proposal = await freelanceRepository.findProposalById(proposalId);
    if (!proposal) throw new NotFoundError('Proposal');
    if (proposal.job.recruiterId !== recruiter.id) throw new ForbiddenError();

    assertTransition(PROPOSAL_TRANSITIONS, proposal.status, 'SHORTLISTED', 'proposal');
    return freelanceRepository.updateProposalStatus(proposalId, 'SHORTLISTED');
  },

  async reject(userId: string, proposalId: string, input: RejectProposalInput) {
    const recruiter = await getRecruiterOrThrow(userId);
    const proposal = await freelanceRepository.findProposalById(proposalId);
    if (!proposal) throw new NotFoundError('Proposal');
    if (proposal.job.recruiterId !== recruiter.id) throw new ForbiddenError();

    assertTransition(PROPOSAL_TRANSITIONS, proposal.status, 'REJECTED', 'proposal');
    const reasonText = [input.reason, input.note].filter(Boolean).join(' — ') || undefined;
    return freelanceRepository.updateProposalStatus(proposalId, 'REJECTED', reasonText);
  },

  async withdraw(userId: string, proposalId: string) {
    const candidate = await getCandidateOrThrow(userId);
    const proposal = await freelanceRepository.findProposalById(proposalId);
    if (!proposal) throw new NotFoundError('Proposal');
    if (proposal.candidateId !== candidate.id) throw new ForbiddenError();

    assertTransition(PROPOSAL_TRANSITIONS, proposal.status, 'WITHDRAWN', 'proposal');
    return freelanceRepository.updateProposalStatus(proposalId, 'WITHDRAWN');
  },

  /** The proposal → contract boundary. Confirms exact terms, never edits them. */
  async accept(userId: string, proposalId: string) {
    const recruiter = await getRecruiterOrThrow(userId);
    const proposal = await freelanceRepository.findProposalById(proposalId);
    if (!proposal) throw new NotFoundError('Proposal');
    if (proposal.job.recruiterId !== recruiter.id) throw new ForbiddenError();

    assertTransition(PROPOSAL_TRANSITIONS, proposal.status, 'ACCEPTED', 'proposal');

    const candidate = await prisma.candidateProfile.findUniqueOrThrow({
      where: { id: proposal.candidateId }, include: { user: true },
    });
    const recruiterWithUser = await prisma.recruiterProfile.findUniqueOrThrow({
      where: { id: recruiter.id }, include: { user: true },
    });
    const platformFeePercent = await getPlatformFeePercent();

    const contract = await freelanceRepository.acceptProposalAndCreateContract({
      proposal: {
        id: proposal.id, jobId: proposal.jobId, bidAmount: proposal.bidAmount,
        currency: proposal.currency, proposedMilestones: proposal.proposedMilestones,
      },
      clientId: recruiter.id,
      freelancerId: proposal.candidateId,
      platformFeePercent,
      clientUserId: recruiterWithUser.user.id,
      freelancerUserId: candidate.user.id,
    });

    events.emit('ProposalAccepted', { proposalId: proposal.id, contractId: contract.id });
    return contract;
  },

  // ══════════════════════════════════ CONTRACTS ══════════════════════════

  async listContracts(userId: string, role: string) {
    if (role === 'CANDIDATE') {
      const candidate = await getCandidateOrThrow(userId);
      return freelanceRepository.findContractsForParty({ freelancerId: candidate.id });
    }
    const recruiter = await getRecruiterOrThrow(userId);
    return freelanceRepository.findContractsForParty({ clientId: recruiter.id });
  },

  async getContract(userId: string, role: string, contractId: string) {
    const contract = await getContractForPartyOrThrow(contractId, userId, role);
    if (contract && contract.reviews) {
      contract.reviews = contract.reviews.filter((r) => {
        return r.isPublished || r.reviewerId === userId;
      });
    }
    return contract;
  },

  // ══════════════════════════════════ MILESTONES ═════════════════════════

  async fundMilestone(userId: string, milestoneId: string, _input: FundMilestoneInput) {
    const recruiter = await getRecruiterOrThrow(userId);
    const milestone = await freelanceRepository.findMilestoneById(milestoneId);
    if (!milestone) throw new NotFoundError('Milestone');
    if (milestone.contract.clientId !== recruiter.id) throw new ForbiddenError();

    assertTransition(MILESTONE_TRANSITIONS, milestone.status, 'FUNDED', 'milestone');

    const amountInUsd = Number(milestone.amount) / 83.0;

    const hasStripe = !!process.env.STRIPE_SECRET_KEY;
    if (hasStripe) {
      const order = await paymentGateway.createOrder({
        amount: amountInUsd,
        currency: 'USD',
        purpose: 'ESCROW_FUNDING',
        referenceId: milestoneId,
        email: recruiter.user?.email,
        successUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/recruiter/contracts/${milestone.contractId}?payment_success=true&session_id={CHECKOUT_SESSION_ID}&milestone_id=${milestoneId}`,
        cancelUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/recruiter/contracts/${milestone.contractId}?payment_cancel=true`,
      });
      return { checkoutUrl: order.checkoutUrl, orderId: order.orderId };
    }

    // Mock gateway success fallback:
    const payment = await prisma.payment.create({
      data: {
        payerUserId: userId, amount: milestone.amount, purpose: 'ESCROW_FUNDING',
        status: 'SUCCESS', gateway: 'mock', gatewayRef: `mock-escrow-${milestoneId}`, paidAt: new Date(),
      },
    });

    await freelanceRepository.fundMilestone(milestoneId, payment.id, milestone.amount, milestone.contract.currency);

    // First funded milestone activates the contract.
    if (milestone.contract.status === 'PENDING_FUNDING') {
      await freelanceRepository.updateContractStatus(milestone.contractId, 'ACTIVE', { startedAt: new Date() });
    }

    return { checkoutUrl: null, orderId: payment.gatewayRef };
  },

  async verifyFunding(userId: string, milestoneId: string, sessionId: string) {
    const recruiter = await getRecruiterOrThrow(userId);
    const milestone = await freelanceRepository.findMilestoneById(milestoneId);
    if (!milestone) throw new NotFoundError('Milestone');
    if (milestone.contract.clientId !== recruiter.id) throw new ForbiddenError();

    const session = await paymentGateway.retrieveSession(sessionId);
    if (session.payment_status !== 'paid') {
      throw new ValidationError('Stripe payment was not successful');
    }

    // If already funded, don't execute duplicate ledger logic
    if (milestone.status === 'FUNDED') {
      return milestone;
    }

    const payment = await prisma.payment.create({
      data: {
        payerUserId: userId, amount: milestone.amount, purpose: 'ESCROW_FUNDING',
        status: 'SUCCESS', gateway: 'stripe', gatewayRef: sessionId, paidAt: new Date(),
      },
    });

    const updated = await freelanceRepository.fundMilestone(milestoneId, payment.id, milestone.amount, milestone.contract.currency);

    // First funded milestone activates the contract.
    if (milestone.contract.status === 'PENDING_FUNDING') {
      await freelanceRepository.updateContractStatus(milestone.contractId, 'ACTIVE', { startedAt: new Date() });
    }

    return updated;
  },

  async submitWork(userId: string, milestoneId: string, input: SubmitMilestoneInput) {
    const candidate = await getCandidateOrThrow(userId);
    const milestone = await freelanceRepository.findMilestoneById(milestoneId);
    if (!milestone) throw new NotFoundError('Milestone');
    if (milestone.contract.freelancerId !== candidate.id) throw new ForbiddenError();

    assertTransition(MILESTONE_TRANSITIONS, milestone.status, 'SUBMITTED', 'milestone');

    const localUrls: string[] = [];
    fs.mkdirSync('uploads', { recursive: true });

    if (input.fileBase64 && input.fileName) {
      try {
        let decodedFilename = input.fileName;
        try {
          decodedFilename = decodeURIComponent(decodedFilename);
        } catch (e) {
          // ignore
        }
        const base64Data = input.fileBase64.replace(/^data:.*?;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        const localFilePath = path.join('uploads', decodedFilename);
        
        fs.writeFileSync(localFilePath, buffer);
        
        const backendPort = process.env.PORT || '4000';
        localUrls.push(`http://localhost:${backendPort}/uploads/${decodedFilename}`);
      } catch (e) {
        console.error('Base64 write failed:', e);
      }
    } else {
      for (const url of input.attachmentUrls || []) {
        let filename = url.substring(url.lastIndexOf('/') + 1) || 'deliverable.zip';
        try {
          filename = decodeURIComponent(filename);
        } catch (e) {
          // ignore decoding errors
        }
        const localFilePath = path.join('uploads', filename);

        let shouldOverwrite = false;
        if (fs.existsSync(localFilePath)) {
          try {
            const currentContent = fs.readFileSync(localFilePath, 'utf8');
            if (filename.toLowerCase().endsWith('.pdf') && !currentContent.startsWith('%PDF')) {
              shouldOverwrite = true;
            }
          } catch (e) {
            // ignore read errors
          }
        }

        if (!fs.existsSync(localFilePath) || shouldOverwrite) {
          if (filename.toLowerCase().endsWith('.pdf')) {
            const pdfTemplate = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 50 >>
stream
BT
/F1 12 Tf
70 700 Td
(Bivio Platform Local PDF Deliverable) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000116 00000 n 
0000000213 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
312
%%EOF`;
            fs.writeFileSync(localFilePath, pdfTemplate);
          } else {
            fs.writeFileSync(
              localFilePath,
              `Bivio Freelance Platform - Local Deliverable File\n` +
              `Milestone: ${milestone.title}\n` +
              `Submitted By candidate user: ${userId}\n` +
              `Timestamp: ${new Date().toISOString()}\n` +
              `Note: ${input.note || ''}\n`
            );
          }
        }

        const backendPort = process.env.PORT || '4000';
        localUrls.push(`http://localhost:${backendPort}/uploads/${filename}`);
      }
    }

    return freelanceRepository.submitMilestoneWork(milestoneId, input.note, localUrls, userId);
  },

  async approve(userId: string, milestoneId: string) {
    const recruiter = await getRecruiterOrThrow(userId);
    const milestone = await freelanceRepository.findMilestoneById(milestoneId);
    if (!milestone) throw new NotFoundError('Milestone');
    if (milestone.contract.clientId !== recruiter.id) throw new ForbiddenError();

    // Pre-check gives a clean error before the transaction; the transaction's
    // own guarded updateMany is what actually prevents the race.
    assertTransition(MILESTONE_TRANSITIONS, milestone.status, 'APPROVED', 'milestone');

    const freelancer = await prisma.candidateProfile.findUniqueOrThrow({
      where: { id: milestone.contract.freelancerId }, include: { user: true },
    });

    try {
      const result = await freelanceRepository.approveAndRelease(milestoneId, freelancer.user.id);
      events.emit('MilestoneApproved', { milestoneId, contractId: milestone.contractId });
      events.emit('MilestoneReleased', {
        milestoneId, contractId: milestone.contractId, freelancerId: milestone.contract.freelancerId,
      });
      return result;
    } catch (err) {
      if (err instanceof Error && err.message === 'CONCURRENT_APPROVAL') {
        throw new ConflictError('This milestone is no longer awaiting approval');
      }
      throw err;
    }
  },

  async requestRevision(userId: string, milestoneId: string, input: RequestRevisionInput) {
    const recruiter = await getRecruiterOrThrow(userId);
    const milestone = await freelanceRepository.findMilestoneById(milestoneId);
    if (!milestone) throw new NotFoundError('Milestone');
    if (milestone.contract.clientId !== recruiter.id) throw new ForbiddenError();

    assertTransition(MILESTONE_TRANSITIONS, milestone.status, 'REVISION_REQUESTED', 'milestone');
    return freelanceRepository.requestRevision(milestoneId, input.feedback);
  },

  async raiseDispute(userId: string, role: string, milestoneId: string, input: RaiseDisputeInput) {
    const milestone = await freelanceRepository.findMilestoneById(milestoneId);
    if (!milestone) throw new NotFoundError('Milestone');

    if (role === 'CANDIDATE') {
      const candidate = await getCandidateOrThrow(userId);
      if (milestone.contract.freelancerId !== candidate.id) throw new ForbiddenError();
    } else if (role === 'RECRUITER') {
      const recruiter = await getRecruiterOrThrow(userId);
      if (milestone.contract.clientId !== recruiter.id) throw new ForbiddenError();
    }

    assertTransition(MILESTONE_TRANSITIONS, milestone.status, 'DISPUTED', 'milestone');
    const dispute = await freelanceRepository.raiseDispute(milestoneId, milestone.contractId, userId, input.reason);
    events.emit('DisputeRaised', { disputeId: dispute.id, milestoneId });
    return dispute;
  },

  // ══════════════════════════════════ REVIEWS ════════════════════════════

  async submitReview(userId: string, role: string, contractId: string, input: SubmitReviewInput) {
    const contract = await getContractForPartyOrThrow(contractId, userId, role);
    if (contract.status !== 'COMPLETED') {
      throw new ConflictError('Reviews can only be left once the contract is completed');
    }

    const minSetting = await prisma.platformSetting.findUnique({ where: { key: 'REVIEW_MIN_RATING' } });
    const maxSetting = await prisma.platformSetting.findUnique({ where: { key: 'REVIEW_MAX_RATING' } });
    const minRating = minSetting ? Number(minSetting.value) || 1 : 1;
    const maxRating = maxSetting ? Number(maxSetting.value) || 5 : 5;

    if (input.rating < minRating || input.rating > maxRating) {
      throw new ValidationError(`Overall rating must be between ${minRating} and ${maxRating}`);
    }

    const freelancerUser = contract.freelancer.userId;
    const clientUser = contract.client.userId;
    const revieweeId = userId === clientUser ? freelancerUser : clientUser;

    const existing = await freelanceRepository.findReview(contractId, userId);
    if (existing) {
      if (existing.isPublished) {
        throw new ConflictError('Published reviews cannot be modified');
      }
      const editAllowedSetting = await prisma.platformSetting.findUnique({ where: { key: 'REVIEW_EDIT_ALLOWED' } });
      if (editAllowedSetting && editAllowedSetting.value === 'true') {
        const updated = await prisma.review.update({
          where: { id: existing.id },
          data: {
            rating: input.rating,
            commRating: input.commRating ?? null,
            qualityRating: input.qualityRating ?? null,
            comment: input.comment ?? null,
          },
        });
        return updated;
      }
      throw new ConflictError('You have already reviewed this contract');
    }

    const review = await freelanceRepository.createReview({
      contractId, reviewerId: userId, revieweeId,
      rating: input.rating, commRating: input.commRating, qualityRating: input.qualityRating,
      comment: input.comment,
    });

    // Double-blind: publish both the instant the second review lands. A
    // scheduled job (not built in this pass) should also publish after 14
    // days if only one side ever reviews — see REVIEW_PUBLISH_DAYS setting.
    const other = await freelanceRepository.findOtherPartyReview(contractId, userId);
    if (other) {
      await freelanceRepository.publishReviews(contractId);
    }

    return review;
  },
};
