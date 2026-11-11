import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UnauthorizedError } from '../shared/errors';
import type { Role } from '@prisma/client';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: Role;
    /** Present only when this request is an admin operating inside an
     * impersonation session (see admin.service.ts's impersonate()). */
    impersonating?: true;
    actualAdminId?: string;
  };
}

interface AccessTokenPayload {
  sub: string;
  role: Role;
  impersonating?: true;
  actualAdminId?: string;
}

function extractUser(payload: AccessTokenPayload): AuthenticatedRequest['user'] {
  return {
    id: payload.sub,
    role: payload.role,
    ...(payload.impersonating ? { impersonating: true as const, actualAdminId: payload.actualAdminId } : {}),
  };
}

/** Verifies the bearer access token and attaches { id, role, ... } to req.user. */
export function authenticate(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new UnauthorizedError());
  }

  const token = header.slice('Bearer '.length);
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;
    req.user = extractUser(payload);
    next();
  } catch {
    next(new UnauthorizedError('Invalid or expired token'));
  }
}

/** Attaches req.user if a valid token is present, but never rejects the request. */
export function optionalAuthenticate(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next();

  const token = header.slice('Bearer '.length);
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;
    req.user = extractUser(payload);
  } catch {
    // ignore — request proceeds unauthenticated
  }
  next();
}
