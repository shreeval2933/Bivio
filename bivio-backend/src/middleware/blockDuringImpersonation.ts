import { Response, NextFunction } from 'express';
import { ForbiddenError } from '../shared/errors';
import { AuthenticatedRequest } from './authenticate';

/**
 * Applied to the highest-risk routes only — moving money and moderating
 * other users. An admin impersonating a user can look around and reproduce
 * what that user sees, but cannot request a payout, fund/approve a
 * milestone, or moderate anyone while impersonating. This is the safety net
 * OQ-12 flagged as required before impersonation could be considered safe
 * to ship at all.
 */
export function blockDuringImpersonation(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  if (req.user?.impersonating) {
    return next(new ForbiddenError('This action is not available while impersonating a user'));
  }
  next();
}
