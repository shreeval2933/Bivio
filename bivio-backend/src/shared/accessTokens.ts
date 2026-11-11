import jwt from 'jsonwebtoken';
import { env } from '../config/env';

/**
 * Extracted from auth.service.ts for the same reason as purposeTokens.ts —
 * the admin module's impersonation feature needs to mint an access token
 * carrying extra claims (impersonating, actualAdminId) without duplicating
 * the signing logic in a second module.
 */
export interface AccessTokenExtraClaims {
  impersonating?: true;
  actualAdminId?: string;
}

export function signAccessToken(userId: string, role: string, extra?: AccessTokenExtraClaims, ttl?: string): string {
  return jwt.sign({ sub: userId, role, ...extra }, env.JWT_SECRET, {
    expiresIn: (ttl ?? env.ACCESS_TOKEN_TTL) as jwt.SignOptions['expiresIn'],
  });
}
