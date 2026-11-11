import { Response, NextFunction } from 'express';
import type { Role } from '@prisma/client';
import { AuthenticatedRequest } from './authenticate';
import { ForbiddenError, UnauthorizedError } from '../shared/errors';

/**
 * Role-level check only. Resource-level ownership (e.g. "is this recruiter's
 * OWN job") must still be checked in the service layer — this middleware
 * cannot know that, and treating it as sufficient is the classic IDOR gap.
 * See BIVIO_DEV_SPEC.md §8.5.
 */
export function authorize(...allowedRoles: Role[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new UnauthorizedError());
    if (!allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError(`Requires one of: ${allowedRoles.join(', ')}`));
    }
    next();
  };
}
