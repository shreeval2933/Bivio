import { Response, NextFunction } from 'express';
import { freelanceService } from './freelance.service';
import { AuthenticatedRequest } from '../../middleware/authenticate';

export const freelanceController = {
  // Proposals
  async listProposals(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { jobId, mine } = req.query as Record<string, string>;
      const data = await freelanceService.listProposals(req.user!.id, req.user!.role, { jobId, mine: mine === 'true' });
      res.json({ data, total: data.length, page: 1, limit: data.length });
    } catch (err) { next(err); }
  },

  async submitProposal(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.status(201).json(await freelanceService.submitProposal(req.user!.id, req.params.id, req.body));
    } catch (err) { next(err); }
  },

  async shortlist(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json(await freelanceService.shortlist(req.user!.id, req.params.id));
    } catch (err) { next(err); }
  },

  async reject(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json(await freelanceService.reject(req.user!.id, req.params.id, req.body));
    } catch (err) { next(err); }
  },

  async withdraw(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json(await freelanceService.withdraw(req.user!.id, req.params.id));
    } catch (err) { next(err); }
  },

  async accept(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.status(201).json(await freelanceService.accept(req.user!.id, req.params.id));
    } catch (err) { next(err); }
  },

  // Contracts
  async listContracts(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await freelanceService.listContracts(req.user!.id, req.user!.role);
      res.json({ data, total: data.length, page: 1, limit: data.length });
    } catch (err) { next(err); }
  },

  async getContract(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json(await freelanceService.getContract(req.user!.id, req.user!.role, req.params.id));
    } catch (err) { next(err); }
  },

  // Milestones
  async fund(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json(await freelanceService.fundMilestone(req.user!.id, req.params.id, req.body));
    } catch (err) { next(err); }
  },

  async verifyFunding(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json(await freelanceService.verifyFunding(req.user!.id, req.params.id, req.body.sessionId));
    } catch (err) { next(err); }
  },

  async submitWork(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json(await freelanceService.submitWork(req.user!.id, req.params.id, req.body));
    } catch (err) { next(err); }
  },

  async approve(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json(await freelanceService.approve(req.user!.id, req.params.id));
    } catch (err) { next(err); }
  },

  async requestRevision(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json(await freelanceService.requestRevision(req.user!.id, req.params.id, req.body));
    } catch (err) { next(err); }
  },

  async raiseDispute(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.status(201).json(await freelanceService.raiseDispute(req.user!.id, req.user!.role, req.params.id, req.body));
    } catch (err) { next(err); }
  },

  // Reviews
  async submitReview(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.status(201).json(await freelanceService.submitReview(req.user!.id, req.user!.role, req.params.id, req.body));
    } catch (err) { next(err); }
  },
};
