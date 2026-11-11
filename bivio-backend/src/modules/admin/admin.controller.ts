import { Response, NextFunction } from 'express';
import { adminService } from './admin.service';
import { AuthenticatedRequest } from '../../middleware/authenticate';

export const adminController = {
  // Disputes
  async listDisputes(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try { res.json(await adminService.listDisputes(req.query.status as string | undefined)); } catch (err) { next(err); }
  },
  async getDispute(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try { res.json(await adminService.getDisputeDetail(req.params.id)); } catch (err) { next(err); }
  },
  async assignDispute(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try { res.json(await adminService.assignDispute(req.user!.id, req.params.id)); } catch (err) { next(err); }
  },
  async resolveDispute(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try { res.json(await adminService.resolveDispute(req.params.id, req.body)); } catch (err) { next(err); }
  },
  async escalateDispute(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try { res.json(await adminService.escalateDispute(req.params.id, req.body)); } catch (err) { next(err); }
  },

  // Users
  async listUsers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const page = Number(req.query.page ?? 1) || 1;
      const limit = Math.min(Number(req.query.limit ?? 25) || 25, 100);
      const [data, total] = await adminService.listUsers(page, limit);
      res.json({ data, total, page, limit });
    } catch (err) { next(err); }
  },
  async getUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try { res.json(await adminService.getUserDetail(req.params.id)); } catch (err) { next(err); }
  },
  async moderateUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try { res.status(201).json(await adminService.moderateUser(req.user!.id, req.params.id, req.body)); } catch (err) { next(err); }
  },
  async resetUserPassword(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try { res.json(await adminService.resetUserPassword(req.params.id)); } catch (err) { next(err); }
  },
  async impersonate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try { res.status(201).json(await adminService.impersonate(req.user!.id, req.params.id, req.body)); } catch (err) { next(err); }
  },

  // Verifications
  async listVerifications(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try { res.json(await adminService.listKycSubmissions(req.query.status as string | undefined)); } catch (err) { next(err); }
  },
  async approveVerification(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try { res.json(await adminService.approveKyc(req.user!.id, req.params.id, req.body)); } catch (err) { next(err); }
  },
  async rejectVerification(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try { res.json(await adminService.rejectKyc(req.user!.id, req.params.id, req.body)); } catch (err) { next(err); }
  },
  async requestVerificationInfo(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try { res.json(await adminService.requestKycInfo(req.params.id, req.body)); } catch (err) { next(err); }
  },
};
