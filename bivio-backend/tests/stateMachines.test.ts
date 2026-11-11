import { describe, it, expect } from 'vitest';
import {
  assertTransition, JOB_TRANSITIONS, APPLICATION_TRANSITIONS, MILESTONE_TRANSITIONS,
  PAYOUT_TRANSITIONS, DISPUTE_TRANSITIONS, KYC_TRANSITIONS,
} from '../src/shared/stateMachines';
import { ConflictError } from '../src/shared/errors';

describe('assertTransition', () => {
  it('allows a valid job transition', () => {
    expect(() => assertTransition(JOB_TRANSITIONS, 'DRAFT', 'CONFIGURING', 'job')).not.toThrow();
    expect(() => assertTransition(JOB_TRANSITIONS, 'CONFIGURING', 'OPEN', 'job')).not.toThrow();
  });

  it('rejects an invalid job transition', () => {
    expect(() => assertTransition(JOB_TRANSITIONS, 'DRAFT', 'OPEN', 'job')).toThrow(ConflictError);
  });

  it('never allows a job to leave CANCELLED', () => {
    expect(() => assertTransition(JOB_TRANSITIONS, 'CANCELLED', 'DRAFT', 'job')).toThrow(ConflictError);
    expect(() => assertTransition(JOB_TRANSITIONS, 'CANCELLED', 'OPEN', 'job')).toThrow(ConflictError);
  });

  it('allows a job to reopen from CLOSED', () => {
    expect(() => assertTransition(JOB_TRANSITIONS, 'CLOSED', 'OPEN', 'job')).not.toThrow();
  });

  describe('application lifecycle', () => {
    it('allows APPLIED -> IN_PROGRESS -> OFFERED -> HIRED', () => {
      expect(() => assertTransition(APPLICATION_TRANSITIONS, 'APPLIED', 'IN_PROGRESS', 'application')).not.toThrow();
      expect(() => assertTransition(APPLICATION_TRANSITIONS, 'IN_PROGRESS', 'OFFERED', 'application')).not.toThrow();
      expect(() => assertTransition(APPLICATION_TRANSITIONS, 'OFFERED', 'HIRED', 'application')).not.toThrow();
    });

    it('never allows skipping straight from APPLIED to HIRED', () => {
      expect(() => assertTransition(APPLICATION_TRANSITIONS, 'APPLIED', 'HIRED', 'application')).toThrow(ConflictError);
    });

    it('HIRED, REJECTED, and WITHDRAWN are all terminal', () => {
      for (const terminal of ['HIRED', 'REJECTED', 'WITHDRAWN'] as const) {
        expect(() => assertTransition(APPLICATION_TRANSITIONS, terminal, 'IN_PROGRESS', 'application')).toThrow(ConflictError);
      }
    });
  });

  describe('milestone lifecycle — the centerpiece transaction guard', () => {
    it('never allows unfunded work to be submitted (PENDING -> SUBMITTED)', () => {
      expect(() => assertTransition(MILESTONE_TRANSITIONS, 'PENDING', 'SUBMITTED', 'milestone')).toThrow(ConflictError);
    });

    it('never allows skipping client approval (SUBMITTED -> PAID)', () => {
      expect(() => assertTransition(MILESTONE_TRANSITIONS, 'SUBMITTED', 'PAID', 'milestone')).toThrow(ConflictError);
    });

    it('never allows FUNDED straight to PAID', () => {
      expect(() => assertTransition(MILESTONE_TRANSITIONS, 'FUNDED', 'PAID', 'milestone')).toThrow(ConflictError);
    });

    it('PAID is terminal — no transition out, including back to disputed', () => {
      expect(() => assertTransition(MILESTONE_TRANSITIONS, 'PAID', 'DISPUTED', 'milestone')).toThrow(ConflictError);
      expect(() => assertTransition(MILESTONE_TRANSITIONS, 'PAID', 'PENDING', 'milestone')).toThrow(ConflictError);
    });

    it('allows the normal happy path FUNDED -> SUBMITTED -> APPROVED -> PAID', () => {
      expect(() => assertTransition(MILESTONE_TRANSITIONS, 'FUNDED', 'SUBMITTED', 'milestone')).not.toThrow();
      expect(() => assertTransition(MILESTONE_TRANSITIONS, 'SUBMITTED', 'APPROVED', 'milestone')).not.toThrow();
      expect(() => assertTransition(MILESTONE_TRANSITIONS, 'APPROVED', 'PAID', 'milestone')).not.toThrow();
    });

    it('allows a dispute to resolve straight to PAID (admin splits funds in the freelancer\'s favor)', () => {
      expect(() => assertTransition(MILESTONE_TRANSITIONS, 'DISPUTED', 'PAID', 'milestone')).not.toThrow();
    });

    it('allows a dispute to resolve back to PENDING (full refund to client)', () => {
      expect(() => assertTransition(MILESTONE_TRANSITIONS, 'DISPUTED', 'PENDING', 'milestone')).not.toThrow();
    });
  });

  describe('payout lifecycle', () => {
    it('allows the retry path: FAILED -> REQUESTED', () => {
      expect(() => assertTransition(PAYOUT_TRANSITIONS, 'FAILED', 'REQUESTED', 'payout')).not.toThrow();
    });

    it('PAID is terminal', () => {
      expect(() => assertTransition(PAYOUT_TRANSITIONS, 'PAID', 'REQUESTED', 'payout')).toThrow(ConflictError);
    });
  });

  describe('dispute lifecycle', () => {
    it('allows escalation from UNDER_REVIEW', () => {
      expect(() => assertTransition(DISPUTE_TRANSITIONS, 'UNDER_REVIEW', 'ESCALATED', 'dispute')).not.toThrow();
    });

    it('cannot resolve directly from OPEN — must go through UNDER_REVIEW first', () => {
      expect(() => assertTransition(DISPUTE_TRANSITIONS, 'OPEN', 'RESOLVED', 'dispute')).toThrow(ConflictError);
    });

    it('RESOLVED is terminal', () => {
      expect(() => assertTransition(DISPUTE_TRANSITIONS, 'RESOLVED', 'OPEN', 'dispute')).toThrow(ConflictError);
    });
  });

  describe('KYC lifecycle', () => {
    it('allows a retry after rejection', () => {
      expect(() => assertTransition(KYC_TRANSITIONS, 'REJECTED', 'PENDING', 'kyc')).not.toThrow();
    });

    it('cannot submit again while a submission is already PENDING', () => {
      expect(() => assertTransition(KYC_TRANSITIONS, 'PENDING', 'PENDING', 'kyc')).toThrow(ConflictError);
    });

    it('MANUAL_REVIEW cannot be resubmitted around — only admin action moves it', () => {
      expect(() => assertTransition(KYC_TRANSITIONS, 'MANUAL_REVIEW', 'PENDING', 'kyc')).toThrow(ConflictError);
    });
  });
});
