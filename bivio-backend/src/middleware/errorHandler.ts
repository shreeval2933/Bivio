import { ErrorRequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { AppError } from '../shared/errors';

/**
 * Register this LAST, after every route. Mapping Prisma error codes to HTTP
 * status means database constraints become correct API responses
 * automatically — e.g. the partial-unique-index violation on re-applying to
 * a job surfaces as a clean 409, not a raw Postgres error leaking out.
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof AppError && err.isOperational) {
    const body: Record<string, unknown> = { error: err.code, message: err.message };
    if ('details' in err && err.details) body.details = err.details;
    return res.status(err.statusCode).json(body);
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        return res.status(409).json({ error: 'DUPLICATE', message: 'Already exists', target: err.meta?.target });
      case 'P2025':
        return res.status(404).json({ error: 'NOT_FOUND', message: 'Not found' });
      case 'P2003':
        return res.status(400).json({ error: 'FK_VIOLATION', message: 'Related record missing' });
    }
    // CHECK constraint violations surface as P2010/23514 depending on driver —
    // treat as a 422 rather than a raw 500.
    if (err.code === 'P2010' || String(err.meta?.code) === '23514') {
      return res.status(422).json({ error: 'CONSTRAINT_VIOLATION', message: 'Invalid data for this operation' });
    }
  }

  // eslint-disable-next-line no-console
  console.error(`[${req.method} ${req.path}]`, err);
  res.status(500).json({ error: 'INTERNAL', message: 'Something went wrong' });
};
