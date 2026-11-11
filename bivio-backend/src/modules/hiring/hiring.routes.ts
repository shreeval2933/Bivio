import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { hiringController } from './hiring.controller';
import {
  applyToJobSchema, moveStageSchema, bulkStageSchema, bulkRejectSchema, rejectApplicationSchema,
  sendInvitationSchema, respondInvitationSchema,
  extendOfferSchema, respondOfferSchema,
  scheduleInterviewSchema, rescheduleInterviewSchema, interviewFeedbackSchema,
  candidateRespondInterviewSchema,
} from './hiring.schema';

const router = Router();
router.use(authenticate);

// ── Applications ──────────────────────────────────────────────────────────
router.get('/applications', hiringController.listApplications);
router.get('/applications/:id', hiringController.getApplication);
router.post('/jobs/:id/apply', authorize('CANDIDATE'), validate(applyToJobSchema), hiringController.apply);
router.patch('/applications/:id/withdraw', authorize('CANDIDATE'), hiringController.withdraw);
router.patch('/applications/:id/stage', authorize('RECRUITER'), validate(moveStageSchema), hiringController.moveStage);
router.patch('/applications/bulk-stage', authorize('RECRUITER'), validate(bulkStageSchema), hiringController.bulkMoveStage);
router.post('/applications/bulk-reject', authorize('RECRUITER'), validate(bulkRejectSchema), hiringController.bulkReject);
router.patch('/applications/:id/reject', authorize('RECRUITER'), validate(rejectApplicationSchema), hiringController.reject);

// ── Invitations ───────────────────────────────────────────────────────────
router.get('/invitations', hiringController.listInvitations);
router.post('/jobs/:id/invitations', authorize('RECRUITER'), validate(sendInvitationSchema), hiringController.sendInvitation);
router.patch('/invitations/:id/respond', authorize('CANDIDATE'), validate(respondInvitationSchema), hiringController.respondInvitation);

// ── Offers ────────────────────────────────────────────────────────────────
router.get('/offers', hiringController.listOffers);
router.post('/applications/:id/offer', authorize('RECRUITER'), validate(extendOfferSchema), hiringController.extendOffer);
router.patch('/offers/:id/respond', authorize('CANDIDATE'), validate(respondOfferSchema), hiringController.respondOffer);
router.patch('/offers/:id/withdraw', authorize('RECRUITER'), hiringController.withdrawOffer);

// ── Interviews ────────────────────────────────────────────────────────────
router.get('/interviews', hiringController.listInterviews);
router.get('/interviews/recruiter/all', authorize('RECRUITER'), hiringController.listCompanyInterviews);
router.get('/interviews/calendar', hiringController.listCalendarInterviews);
router.get('/interviews/:id', hiringController.getInterview);
router.post('/applications/:id/interviews', authorize('RECRUITER'), validate(scheduleInterviewSchema), hiringController.schedule);
router.patch('/interviews/:id/reschedule', authorize('RECRUITER'), validate(rescheduleInterviewSchema), hiringController.reschedule);
router.patch('/interviews/:id/candidate-respond', authorize('CANDIDATE'), validate(candidateRespondInterviewSchema), hiringController.candidateRespond);
router.patch('/interviews/:id/feedback', authorize('RECRUITER'), validate(interviewFeedbackSchema), hiringController.submitFeedback);
router.patch('/interviews/:id/cancel', authorize('RECRUITER'), hiringController.cancelInterview);

router.post('/jobs/:jobId/stages/:stageId/resend-emails', authorize('RECRUITER'), hiringController.resendStageEmails);

export const hiringRoutes = router;
