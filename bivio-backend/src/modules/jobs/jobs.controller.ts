import { Response, NextFunction } from 'express';
import { jobsService } from './jobs.service';
import { AuthenticatedRequest } from '../../middleware/authenticate';

export const jobsController = {
  async listPublic(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json(await jobsService.listPublic(req.query as never));
    } catch (err) { next(err); }
  },

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json(await jobsService.getById(req.params.id));
    } catch (err) { next(err); }
  },

  async listForRecruiter(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await jobsService.listForRecruiter(req.user!.id);
      res.json({ data, total: data.length, page: 1, limit: data.length });
    } catch (err) { next(err); }
  },

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.status(201).json(await jobsService.createDraft(req.user!.id, req.body));
    } catch (err) { next(err); }
  },

  async updateSection(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json(await jobsService.updateSection(req.user!.id, req.params.id, req.body));
    } catch (err) { next(err); }
  },

  async setStages(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json(await jobsService.setHiringStages(req.user!.id, req.params.id, req.body));
    } catch (err) { next(err); }
  },

  async setWeightage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json(await jobsService.setWeightage(req.user!.id, req.params.id, req.body));
    } catch (err) { next(err); }
  },

  async publish(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json(await jobsService.publish(req.user!.id, req.params.id));
    } catch (err) { next(err); }
  },

  async close(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json(await jobsService.close(req.user!.id, req.params.id));
    } catch (err) { next(err); }
  },

  async reopen(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json(await jobsService.reopen(req.user!.id, req.params.id));
    } catch (err) { next(err); }
  },

  async cancel(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json(await jobsService.cancel(req.user!.id, req.params.id, req.body?.reason));
    } catch (err) { next(err); }
  },

  async duplicate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.status(201).json(await jobsService.duplicate(req.user!.id, req.params.id));
    } catch (err) { next(err); }
  },

  async extendDeadline(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json(await jobsService.extendDeadline(req.user!.id, req.params.id, req.body.deadline));
    } catch (err) { next(err); }
  },
};
