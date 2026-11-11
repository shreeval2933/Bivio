/**
 * State machine transition tables.
 *
 * Define transitions as data, not scattered conditionals — one table, one
 * check, one place to change. `assertTransition` is the single guard every
 * service-layer status change must call before writing to the database.
 *
 * The database backs this up independently (see prisma/migrations/.../
 * migration.sql) via guarded `updateMany` calls in the services — this file
 * is the fast, readable first line of defense with a good error message;
 * the guarded update is what actually prevents a race under concurrency.
 */
import {
  JobStatus, ApplicationStatus, ProposalStatus, ContractStatus,
  MilestoneStatus, EscrowStatus, PaymentStatus, PayoutStatus,
  DisputeStatus, OfferStatus, InviteStatus, InterviewStatus, AccountStatus,
  KycStatus,
} from '@prisma/client';
import { ConflictError } from './errors';

type Transitions<T extends string> = Record<T, readonly T[]>;

// OQ-1 — no PENDING_PAYMENT state; the posting fee is a one-time account-level
// flag on RecruiterProfile, checked once at job-creation time, not a job status.
export const JOB_TRANSITIONS: Transitions<JobStatus> = {
  DRAFT:       ['CONFIGURING', 'CANCELLED'],
  CONFIGURING: ['OPEN', 'CANCELLED'],
  OPEN:        ['CLOSED', 'CANCELLED'],
  CLOSED:      ['OPEN'],                    // reopen, within 30 days — enforced in service layer
  CANCELLED:   [],
};

export const APPLICATION_TRANSITIONS: Transitions<ApplicationStatus> = {
  APPLIED:     ['IN_PROGRESS', 'REJECTED', 'WITHDRAWN'],
  IN_PROGRESS: ['IN_PROGRESS', 'OFFERED', 'REJECTED', 'WITHDRAWN'],
  OFFERED:     ['HIRED', 'REJECTED'],
  HIRED:       [],
  REJECTED:    [],
  WITHDRAWN:   [],
};

export const PROPOSAL_TRANSITIONS: Transitions<ProposalStatus> = {
  SUBMITTED:   ['SHORTLISTED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'],
  SHORTLISTED: ['ACCEPTED', 'REJECTED', 'WITHDRAWN'],
  ACCEPTED:    [],
  REJECTED:    [],
  WITHDRAWN:   [],
};

export const CONTRACT_TRANSITIONS: Transitions<ContractStatus> = {
  PENDING_FUNDING: ['ACTIVE', 'CANCELLED'],
  ACTIVE:          ['COMPLETED', 'CANCELLED', 'DISPUTED'],
  DISPUTED:        ['ACTIVE', 'CANCELLED'],   // dispute is a detour, not an ending
  COMPLETED:       [],
  CANCELLED:       [],
};

// The most important machine in the system — see BIVIO_DEV_SPEC.md §7.1 for the
// transitions that must be IMPOSSIBLE and why (PENDING->SUBMITTED, SUBMITTED->PAID,
// PAID->anything are all refused here, on purpose).
export const MILESTONE_TRANSITIONS: Transitions<MilestoneStatus> = {
  PENDING:            ['FUNDED'],
  FUNDED:             ['SUBMITTED', 'DISPUTED'],
  SUBMITTED:          ['APPROVED', 'REVISION_REQUESTED', 'DISPUTED'],
  REVISION_REQUESTED: ['SUBMITTED', 'DISPUTED'],
  APPROVED:           ['PAID'],
  DISPUTED:           ['APPROVED', 'PENDING', 'PAID'],
  PAID:               [],
};

export const ESCROW_TRANSITIONS: Transitions<EscrowStatus> = {
  HELD:     ['RELEASED', 'REFUNDED', 'FROZEN'],
  FROZEN:   ['RELEASED', 'REFUNDED'],
  RELEASED: [],
  REFUNDED: [],
};

export const PAYMENT_TRANSITIONS: Transitions<PaymentStatus> = {
  INITIATED: ['SUCCESS', 'FAILED'],
  SUCCESS:   ['REFUNDED'],
  FAILED:    [],
  REFUNDED:  [],
};

export const PAYOUT_TRANSITIONS: Transitions<PayoutStatus> = {
  REQUESTED:  ['PROCESSING'],
  PROCESSING: ['PAID', 'FAILED'],
  FAILED:     ['REQUESTED'],   // retry with corrected details
  PAID:       [],
};

export const DISPUTE_TRANSITIONS: Transitions<DisputeStatus> = {
  OPEN:         ['UNDER_REVIEW'],
  UNDER_REVIEW: ['RESOLVED', 'ESCALATED'],
  ESCALATED:    ['RESOLVED'],
  RESOLVED:     [],
};

export const OFFER_TRANSITIONS: Transitions<OfferStatus> = {
  SENT:      ['ACCEPTED', 'REJECTED', 'WITHDRAWN', 'EXPIRED'],
  ACCEPTED:  [],
  REJECTED:  [],
  WITHDRAWN: [],
  EXPIRED:   [],
};

export const INVITE_TRANSITIONS: Transitions<InviteStatus> = {
  SENT:     ['ACCEPTED', 'DECLINED', 'EXPIRED'],
  ACCEPTED: [],
  DECLINED: [],
  EXPIRED:  [],
};

export const INTERVIEW_TRANSITIONS: Transitions<InterviewStatus> = {
  SCHEDULED:   ['RESCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'],
  RESCHEDULED: ['SCHEDULED', 'CANCELLED'],
  NO_SHOW:     ['SCHEDULED'],
  COMPLETED:   [],
  CANCELLED:   [],
};

export const ACCOUNT_TRANSITIONS: Transitions<AccountStatus> = {
  PENDING_VERIFICATION: ['ACTIVE', 'DELETED'],
  ACTIVE:               ['SUSPENDED', 'BANNED', 'DELETED'],
  SUSPENDED:            ['ACTIVE', 'BANNED'],
  BANNED:               ['ACTIVE'],   // successful appeal
  DELETED:              [],
};

export const KYC_TRANSITIONS: Transitions<KycStatus> = {
  NOT_STARTED:    ['PENDING'],
  PENDING:        ['PENDING', 'APPROVED', 'REJECTED', 'MANUAL_REVIEW'],
  REJECTED:       ['PENDING'],          // retry once
  MANUAL_REVIEW:  ['APPROVED', 'REJECTED'],
  APPROVED:       [],
};

export function assertTransition<T extends string>(
  table: Transitions<T>,
  from: T,
  to: T,
  entity: string,
): void {
  if (!table[from].includes(to)) {
    throw new ConflictError(`Cannot move ${entity} from ${from} to ${to}`);
  }
}
