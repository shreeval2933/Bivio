import { EventEmitter } from 'node:events';

/**
 * Cross-module side effects go through this, not direct imports of another
 * module's repository. e.g. `freelance` emits MilestoneReleased; `payments`
 * and `messaging` each listen and do their own thing, without `freelance`
 * knowing either of them exist.
 */
export interface DomainEvents {
  JobPublished: { jobId: string };
  ApplicationStageChanged: { applicationId: string; toStageId: string; stageType: string };
  ProposalAccepted: { proposalId: string; contractId: string };
  MilestoneApproved: { milestoneId: string; contractId: string };
  MilestoneReleased: { milestoneId: string; contractId: string; freelancerId: string };
  DisputeRaised: { disputeId: string; milestoneId: string };
  DisputeResolved: { disputeId: string; contractId: string };
  UserModerated: { userId: string; action: string };
  InvitationSent: { invitationId: string; candidateId: string };
  OfferExtended: { offerId: string; applicationId: string };
  KycSubmitted: { kycSubmissionId: string; recruiterId: string };
  MessageSent: { roomId: string; message: unknown };
}

class TypedEventEmitter extends EventEmitter {
  emit<K extends keyof DomainEvents>(event: K, payload: DomainEvents[K]): boolean {
    return super.emit(event, payload);
  }
  on<K extends keyof DomainEvents>(event: K, listener: (payload: DomainEvents[K]) => void): this {
    return super.on(event, listener);
  }
}

export const events = new TypedEventEmitter();
