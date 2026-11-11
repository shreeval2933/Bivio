import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UnauthorizedError } from './errors';

/**
 * Verify-email, password-reset, and admin-triggered-reset tokens are all
 * short-lived, purpose-scoped JWTs signed with the refresh secret. This
 * avoids needing a dedicated token table for a v1 build — if you later want
 * revocable/one-time-use tokens, swap this for a stored-token model without
 * changing the public API shape.
 *
 * Extracted from auth.service.ts so the admin module's password-reset
 * endpoint can issue the exact same kind of token a self-service reset
 * would, rather than duplicating JWT-signing logic in a second module.
 */
export type PurposeTokenType = 'verify-email' | 'reset-password';

export function signPurposeToken(userId: string, purpose: PurposeTokenType): string {
  return jwt.sign({ sub: userId, purpose }, env.JWT_REFRESH_SECRET, { expiresIn: '1h' });
}

export function verifyPurposeToken(token: string, purpose: PurposeTokenType): string {
  let payload: { sub: string; purpose: string };
  try {
    payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as typeof payload;
  } catch {
    throw new UnauthorizedError('This link has expired or is invalid');
  }
  if (payload.purpose !== purpose) throw new UnauthorizedError('Invalid token');
  return payload.sub;
}
