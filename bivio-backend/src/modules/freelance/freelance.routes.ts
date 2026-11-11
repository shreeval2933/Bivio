import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { blockDuringImpersonation } from '../../middleware/blockDuringImpersonation';
import { validate } from '../../middleware/validate';
import { freelanceController } from './freelance.controller';
import {
  submitProposalSchema, rejectProposalSchema, acceptProposalSchema,
  fundMilestoneSchema, verifyFundingSchema, submitMilestoneSchema, requestRevisionSchema, raiseDisputeSchema,
  submitReviewSchema,
} from './freelance.schema';

const router = Router();
router.use(['/proposals', '/jobs/:id/proposals', '/contracts', '/milestones'], authenticate);

// ── Proposals ─────────────────────────────────────────────────────────────
router.get('/proposals', freelanceController.listProposals);
router.post('/jobs/:id/proposals', authorize('CANDIDATE'), validate(submitProposalSchema), freelanceController.submitProposal);
router.patch('/proposals/:id/shortlist', authorize('RECRUITER'), freelanceController.shortlist);
router.patch('/proposals/:id/reject', authorize('RECRUITER'), validate(rejectProposalSchema), freelanceController.reject);
router.patch('/proposals/:id/withdraw', authorize('CANDIDATE'), freelanceController.withdraw);
router.post('/proposals/:id/accept', authorize('RECRUITER'), validate(acceptProposalSchema), freelanceController.accept);

// ── Contracts ─────────────────────────────────────────────────────────────
router.get('/contracts', freelanceController.listContracts);
router.get('/contracts/:id', freelanceController.getContract);

// ── Milestones — the centerpiece transaction ─────────────────────────────
// fund and approve both move real money — blocked entirely during an admin
// impersonation session (see blockDuringImpersonation's docblock).
router.post('/milestones/:id/fund', authorize('RECRUITER'), blockDuringImpersonation, validate(fundMilestoneSchema), freelanceController.fund);
router.post('/milestones/:id/verify-funding', authorize('RECRUITER'), blockDuringImpersonation, validate(verifyFundingSchema), freelanceController.verifyFunding);
router.post('/milestones/:id/submit', authorize('CANDIDATE'), validate(submitMilestoneSchema), freelanceController.submitWork);
router.post('/milestones/:id/approve', authorize('RECRUITER'), blockDuringImpersonation, freelanceController.approve);
router.post('/milestones/:id/request-revision', authorize('RECRUITER'), validate(requestRevisionSchema), freelanceController.requestRevision);
router.post('/milestones/:id/dispute', validate(raiseDisputeSchema), freelanceController.raiseDispute); // either party

// ── Reviews ───────────────────────────────────────────────────────────────
router.post('/contracts/:id/reviews', validate(submitReviewSchema), freelanceController.submitReview); // either party

export const freelanceRoutes = router;
