import { Request, Response, NextFunction } from 'express';
import { redis } from '../shared/redis';
import { RateLimitError } from '../shared/errors';
import { AuthenticatedRequest } from './authenticate';

interface RateLimitOptions {
  windowSeconds: number;
  max: number;
  /** Defaults to IP; pass e.g. (req) => req.user!.id for per-user limits. */
  keyFn?: (req: Request) => string;
}

export function rateLimit({ windowSeconds, max, keyFn }: RateLimitOptions) {
  return async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    const identity = keyFn ? keyFn(req) : req.ip ?? 'unknown';
    const key = `ratelimit:${req.path}:${identity}`;

    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, windowSeconds);
    }
    if (count > max) {
      return next(new RateLimitError());
    }
    next();
  };
}
