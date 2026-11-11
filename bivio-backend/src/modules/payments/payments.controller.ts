import { Response, NextFunction } from 'express';
import { paymentsService } from './payments.service';
import { AuthenticatedRequest } from '../../middleware/authenticate';

export const paymentsController = {
  async getWallet(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try { res.json(await paymentsService.getWallet(req.user!.id)); } catch (err) { next(err); }
  },

  async getTransactions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try { res.json(await paymentsService.getTransactions(req.user!.id)); } catch (err) { next(err); }
  },

  async listPayouts(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try { res.json(await paymentsService.listPayouts(req.user!.id)); } catch (err) { next(err); }
  },

  async requestPayout(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try { res.status(201).json(await paymentsService.requestPayout(req.user!.id, req.body)); } catch (err) { next(err); }
  },

  async retryPayout(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try { res.json(await paymentsService.retryPayout(req.user!.id, req.params.id)); } catch (err) { next(err); }
  },

  async webhook(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try { res.json(await paymentsService.handleWebhook(req.body)); } catch (err) { next(err); }
  },
};
