import { prisma } from '../../shared/prisma';
import { Prisma } from '@prisma/client';

const CONTRACT_INCLUDE = {
  job: true,
  client: { include: { user: true } },
  freelancer: {
    include: {
      user: true,
      skills: { include: { skill: true } },
      portfolio: { include: { projects: true } },
    }
  },
  milestones: {
    include: { escrow: true, submissions: { orderBy: { versionNo: 'asc' as const } } },
    orderBy: { sequence: 'asc' as const },
  },
  reviews: true,
  chatRoom: {
    include: {
      messages: {
        orderBy: { sentAt: 'asc' as const },
        include: { sender: true }
      }
    }
  },
} satisfies Prisma.ContractInclude;

export const freelanceRepository = {
  // ── Proposals ─────────────────────────────────────────────────────────
  findProposals(where: Prisma.ProposalWhereInput) {
    return prisma.proposal.findMany({
      where,
      include: {
        job: { include: { company: true } },
        candidate: {
          include: {
            user: true,
            portfolio: {
              include: {
                projects: true,
              }
            },
            skills: {
              include: {
                skill: true,
              }
            },
            matchScores: true,
          }
        }
      },
      orderBy: { submittedAt: 'desc' },
    });
  },

  findProposalById(id: string) {
    return prisma.proposal.findUnique({
      where: { id },
      include: {
        job: true,
        candidate: {
          include: {
            user: true,
            portfolio: {
              include: {
                projects: true,
              }
            },
            skills: {
              include: {
                skill: true,
              }
            },
            matchScores: true,
          }
        }
      },
    });
  },

  hasLiveProposal(jobId: string, candidateId: string) {
    return prisma.proposal
      .count({ where: { jobId, candidateId, status: { notIn: ['WITHDRAWN', 'REJECTED'] } } })
      .then((n) => n > 0);
  },

  createProposal(data: {
    jobId: string; candidateId: string; bidAmount: number; currency: string;
    durationDays?: number; estimatedHours?: number; coverLetter: string; proposedMilestones: any;
  }) {
    return prisma.proposal.create({ data });
  },

  updateProposalStatus(id: string, status: Prisma.ProposalUpdateInput['status'], rejectionReason?: string) {
    return prisma.proposal.update({ where: { id }, data: { status, rejectionReason } });
  },

  // ── Contracts ─────────────────────────────────────────────────────────
  async findContractById(id: string) {
    const contract = await prisma.contract.findUnique({ where: { id }, include: CONTRACT_INCLUDE });
    if (!contract) return null;

    const submissionIds: string[] = [];
    contract.milestones.forEach((m) => {
      (m.submissions || []).forEach((sub: any) => {
        submissionIds.push(sub.id);
      });
    });

    if (submissionIds.length > 0) {
      const attachments = await prisma.attachment.findMany({
        where: { ownerType: 'SUBMISSION', ownerId: { in: submissionIds } }
      });
      contract.milestones.forEach((m) => {
        (m.submissions || []).forEach((sub: any) => {
          const subAtts = attachments.filter((att) => att.ownerId === sub.id);
          sub.attachmentUrls = subAtts.map((att) => att.fileUrl);
        });
      });
    }

    return contract;
  },

  findContractsForParty(where: Prisma.ContractWhereInput) {
    return prisma.contract.findMany({
      where,
      include: {
        job: true,
        client: { include: { user: true } },
        freelancer: { include: { user: true } },
        milestones: { select: { id: true, status: true, amount: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * The proposal → contract transaction. Creates the contract from the
   * proposal's exact frozen terms, materializes real Milestone rows from
   * proposedMilestones, opens the chat room, and marks the proposal accepted
   * — all atomically. platformFeePercent is captured here and never changes
   * again for this contract, even if the platform-wide rate changes later.
   */
  async acceptProposalAndCreateContract(params: {
    proposal: { id: string; jobId: string; bidAmount: Prisma.Decimal; currency: string; proposedMilestones: unknown };
    clientId: string; freelancerId: string; platformFeePercent: number;
    clientUserId: string; freelancerUserId: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const contract = await tx.contract.create({
        data: {
          jobId: params.proposal.jobId,
          proposalId: params.proposal.id,
          clientId: params.clientId,
          freelancerId: params.freelancerId,
          agreedAmount: params.proposal.bidAmount,
          currency: params.proposal.currency,
          platformFeePercent: params.platformFeePercent,
          status: 'PENDING_FUNDING',
        },
      });

      const milestones = (params.proposal.proposedMilestones ?? []) as Array<{
        title: string; description?: string; amount: number; sequence: number;
      }>;
      for (const m of milestones) {
        await tx.milestone.create({
          data: {
            contractId: contract.id, title: m.title, description: m.description,
            amount: m.amount, sequence: m.sequence, status: 'PENDING',
          },
        });
      }

      await tx.proposal.update({ where: { id: params.proposal.id }, data: { status: 'ACCEPTED' } });

      const room = await tx.chatRoom.create({
        data: { roomType: 'CONTRACT', contractId: contract.id, contextLabel: null },
      });
      await tx.chatParticipant.createMany({
        data: [
          { roomId: room.id, userId: params.clientUserId },
          { roomId: room.id, userId: params.freelancerUserId },
        ],
      });

      return tx.contract.findUniqueOrThrow({ where: { id: contract.id }, include: CONTRACT_INCLUDE });
    });
  },

  updateContractStatus(id: string, status: Prisma.ContractUpdateInput['status'], extra?: Prisma.ContractUpdateInput) {
    return prisma.contract.update({ where: { id }, data: { status, ...extra } });
  },

  // ── Milestones ────────────────────────────────────────────────────────
  async findMilestoneById(id: string) {
    const milestone = await prisma.milestone.findUnique({
      where: { id },
      include: {
        contract: { include: { job: true, client: true, freelancer: true } },
        escrow: true,
        submissions: { orderBy: { versionNo: 'desc' } },
      },
    });
    if (!milestone) return null;

    const submissionIds = milestone.submissions.map((sub: any) => sub.id);
    if (submissionIds.length > 0) {
      const attachments = await prisma.attachment.findMany({
        where: { ownerType: 'SUBMISSION', ownerId: { in: submissionIds } }
      });
      milestone.submissions.forEach((sub: any) => {
        const subAtts = attachments.filter((att) => att.ownerId === sub.id);
        sub.attachmentUrls = subAtts.map((att) => att.fileUrl);
      });
    }

    return milestone;
  },

  countMilestonesNotPaid(contractId: string) {
    return prisma.milestone.count({ where: { contractId, status: { not: 'PAID' } } });
  },

  fundMilestone(milestoneId: string, paymentId: string, amount: Prisma.Decimal, currency: string) {
    return prisma.$transaction(async (tx) => {
      await tx.escrow.create({
        data: { milestoneId, paymentId, amount, currency, status: 'HELD', fundedAt: new Date() },
      });
      return tx.milestone.update({ where: { id: milestoneId }, data: { status: 'FUNDED' } });
    });
  },

  async submitMilestoneWork(milestoneId: string, note?: string, attachmentUrls: string[] = [], uploadedById?: string) {
    return prisma.$transaction(async (tx) => {
      const lastVersion = await tx.milestoneSubmission.count({ where: { milestoneId } });
      const submission = await tx.milestoneSubmission.create({
        data: { milestoneId, versionNo: lastVersion + 1, note, status: 'SUBMITTED' },
      });

      if (uploadedById) {
        for (const url of attachmentUrls) {
          const filename = url.substring(url.lastIndexOf('/') + 1) || 'Deliverable';
          await tx.attachment.create({
            data: {
              ownerType: 'SUBMISSION',
              ownerId: submission.id,
              uploadedById,
              fileUrl: url,
              fileName: filename,
              mimeType: 'application/octet-stream',
              sizeBytes: 1024
            }
          });
        }
      }

      return tx.milestone.update({ where: { id: milestoneId }, data: { status: 'SUBMITTED' } });
    });
  },

  requestRevision(milestoneId: string, feedback: string) {
    return prisma.$transaction(async (tx) => {
      const latest = await tx.milestoneSubmission.findFirst({
        where: { milestoneId }, orderBy: { versionNo: 'desc' },
      });
      if (latest) {
        await tx.milestoneSubmission.update({
          where: { id: latest.id }, data: { status: 'REVISION_REQUESTED', feedback, reviewedAt: new Date() },
        });
      }
      return tx.milestone.update({ where: { id: milestoneId }, data: { status: 'REVISION_REQUESTED' } });
    });
  },

  /**
   * THE guarded, atomic release transaction. Everything inside one
   * $transaction: guarded status update (idempotency — a double-clicked
   * approve matches zero rows on the second attempt), escrow release, fee
   * record, wallet credit under a row lock, ledger write, and contract
   * completion if this was the last milestone.
   */
  async approveAndRelease(milestoneId: string, freelancerUserId: string) {
    return prisma.$transaction(async (tx) => {
      // Guarded transition — idempotent under concurrent double-clicks.
      const updated = await tx.milestone.updateMany({
        where: { id: milestoneId, status: 'SUBMITTED' },
        data: { status: 'APPROVED', approvedAt: new Date() },
      });
      if (updated.count === 0) {
        throw new Error('CONCURRENT_APPROVAL'); // caught and translated to ConflictError by the service
      }

      const milestone = await tx.milestone.findUniqueOrThrow({
        where: { id: milestoneId },
        include: { contract: true, escrow: true },
      });
      if (!milestone.escrow) throw new Error('NO_ESCROW');

      await tx.escrow.update({
        where: { milestoneId }, data: { status: 'RELEASED', releasedAt: new Date() },
      });

      const feePct = milestone.contract.platformFeePercent;
      const fee = milestone.amount.mul(feePct).div(100);
      const net = milestone.amount.sub(fee);

      await tx.platformFee.create({
        data: { contractId: milestone.contractId, feeType: 'FREELANCE_COMMISSION', amount: fee, percentage: feePct },
      });

      // Row lock on the wallet — CHECK(balance >= 0) alone does not prevent a
      // concurrent double-spend; this lock does. See BIVIO_DEV_SPEC.md §8.2.
      const [wallet] = await tx.$queryRaw<Array<{ id: string; available_balance: Prisma.Decimal }>>`
        SELECT * FROM wallets WHERE user_id = ${freelancerUserId}::uuid FOR UPDATE
      `;
      if (!wallet) throw new Error('NO_WALLET');

      const newBalance = new Prisma.Decimal(wallet.available_balance).add(net);
      await tx.wallet.update({ where: { id: wallet.id }, data: { availableBalance: newBalance } });
      await tx.transaction.create({
        data: {
          walletId: wallet.id, direction: 'CREDIT', amount: net, balanceAfter: newBalance,
          referenceType: 'ESCROW', referenceId: milestone.escrow.id,
          description: `Milestone released: ${milestone.title}`,
        },
      });

      await tx.milestone.update({ where: { id: milestoneId }, data: { status: 'PAID' } });

      const remaining = await tx.milestone.count({
        where: { contractId: milestone.contractId, status: { not: 'PAID' } },
      });
      if (remaining === 0) {
        await tx.contract.update({
          where: { id: milestone.contractId }, data: { status: 'COMPLETED', endedAt: new Date() },
        });
        await tx.freelancePortfolio.updateMany({
          where: { candidateId: milestone.contract.freelancerId },
          data: { totalContracts: { increment: 1 } },
        });
      }

      return { milestoneId, net, fee, contractCompleted: remaining === 0 };
    });
  },

  raiseDispute(milestoneId: string, contractId: string, raisedByUserId: string, reason: string) {
    return prisma.$transaction(async (tx) => {
      await tx.milestone.update({ where: { id: milestoneId }, data: { status: 'DISPUTED' } });
      const escrow = await tx.escrow.findUnique({ where: { milestoneId } });
      if (escrow) {
        await tx.escrow.update({ where: { milestoneId }, data: { status: 'FROZEN' } });
      }
      await tx.contract.update({ where: { id: contractId }, data: { status: 'DISPUTED' } });
      return tx.dispute.create({
        data: { milestoneId, raisedByUserId, reason, status: 'OPEN' },
      });
    });
  },

  // ── Reviews ───────────────────────────────────────────────────────────
  findReview(contractId: string, reviewerId: string) {
    return prisma.review.findUnique({ where: { contractId_reviewerId: { contractId, reviewerId } } });
  },

  findOtherPartyReview(contractId: string, notReviewerId: string) {
    return prisma.review.findFirst({ where: { contractId, reviewerId: { not: notReviewerId } } });
  },

  createReview(data: {
    contractId: string; reviewerId: string; revieweeId: string; rating: number;
    commRating?: number; qualityRating?: number; comment?: string;
  }) {
    return prisma.review.create({ data });
  },

  publishReviews(contractId: string) {
    return prisma.review.updateMany({ where: { contractId }, data: { isPublished: true } });
  },
};
