import { Response, NextFunction } from 'express';
import { hiringService } from './hiring.service';
import { AuthenticatedRequest } from '../../middleware/authenticate';

export const hiringController = {
  // Applications
  async listApplications(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { jobId, mine } = req.query as Record<string, string>;
      const data = await hiringService.listApplications(req.user!.id, req.user!.role, {
        jobId, mine: mine === 'true',
      });
      res.json({ data, total: data.length, page: 1, limit: data.length });
    } catch (err) { next(err); }
  },

  async getApplication(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json(await hiringService.getApplicationDetail(req.user!.id, req.user!.role, req.params.id));
    } catch (err) { next(err); }
  },

  async apply(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.status(201).json(await hiringService.apply(req.user!.id, req.params.id, req.body));
    } catch (err) { next(err); }
  },

  async withdraw(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json(await hiringService.withdraw(req.user!.id, req.params.id));
    } catch (err) { next(err); }
  },

  async moveStage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json(await hiringService.moveStage(req.user!.id, req.params.id, req.body));
    } catch (err) { next(err); }
  },

  async bulkMoveStage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json(await hiringService.bulkMoveStage(req.user!.id, req.body));
    } catch (err) { next(err); }
  },

  async bulkReject(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json(await hiringService.bulkReject(req.user!.id, req.body));
    } catch (err) { next(err); }
  },

  async reject(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json(await hiringService.reject(req.user!.id, req.params.id, req.body));
    } catch (err) { next(err); }
  },

  // Invitations
  async listInvitations(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json(await hiringService.listInvitations(req.user!.id, req.user!.role));
    } catch (err) { next(err); }
  },

  async sendInvitation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.status(201).json(await hiringService.sendInvitation(req.user!.id, req.params.id, req.body));
    } catch (err) { next(err); }
  },

  async respondInvitation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json(await hiringService.respondInvitation(req.user!.id, req.params.id, req.body));
    } catch (err) { next(err); }
  },

  // Offers
  async listOffers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json(await hiringService.listOffers(req.user!.id, req.user!.role));
    } catch (err) { next(err); }
  },

  async extendOffer(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.status(201).json(await hiringService.extendOffer(req.user!.id, req.params.id, req.body));
    } catch (err) { next(err); }
  },

  async respondOffer(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json(await hiringService.respondOffer(req.user!.id, req.params.id, req.body));
    } catch (err) { next(err); }
  },

  async withdrawOffer(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json(await hiringService.withdrawOffer(req.user!.id, req.params.id));
    } catch (err) { next(err); }
  },

  // Interviews
  async listInterviews(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const view = req.query.view as 'upcoming' | 'needs-feedback' | 'past' | undefined;
      res.json(await hiringService.listInterviews(req.user!.id, req.user!.role, view));
    } catch (err) { next(err); }
  },

  async listCompanyInterviews(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json(await hiringService.listCompanyInterviews(req.user!.id));
    } catch (err) { next(err); }
  },

  async listCalendarInterviews(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = req.query as Record<string, string>;
      if (!startDate || !endDate) {
        throw new Error('startDate and endDate query parameters are required');
      }
      res.json(await hiringService.listCalendarInterviews(req.user!.id, req.user!.role, startDate, endDate));
    } catch (err) { next(err); }
  },

  async candidateRespond(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json(await hiringService.candidateRespond(req.user!.id, req.params.id, req.body));
    } catch (err) { next(err); }
  },

  async getInterview(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json(await hiringService.getInterviewDetail(req.user!.id, req.user!.role, req.params.id));
    } catch (err) { next(err); }
  },

  async schedule(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.status(201).json(await hiringService.schedule(req.user!.id, req.params.id, req.body));
    } catch (err) { next(err); }
  },

  async reschedule(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json(await hiringService.reschedule(req.user!.id, req.params.id, req.body));
    } catch (err) { next(err); }
  },

  async submitFeedback(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json(await hiringService.submitFeedback(req.user!.id, req.params.id, req.body));
    } catch (err) { next(err); }
  },

  async cancelInterview(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json(await hiringService.cancel(req.user!.id, req.params.id));
    } catch (err) { next(err); }
  },

  async resendStageEmails(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { jobId, stageId } = req.params;
      res.json(await hiringService.resendStageEmails(req.user!.id, jobId, stageId));
    } catch (err) { next(err); }
  },
};
