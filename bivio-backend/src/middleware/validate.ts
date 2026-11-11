import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { ValidationError } from '../shared/errors';

type Target = 'body' | 'query' | 'params';

/**
 * Validates req[target] against a Zod schema and REPLACES req[target] with the
 * parsed (and therefore type-coerced/defaulted) result, so downstream handlers
 * can trust the shape completely rather than re-checking it.
 */
export function validate(schema: ZodSchema, target: Target = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      return next(new ValidationError('Validation failed', result.error.flatten()));
    }
    (req as any)[target] = result.data;
    next();
  };
}
