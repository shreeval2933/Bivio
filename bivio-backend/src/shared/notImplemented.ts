import { Request, Response } from 'express';

/**
 * Placeholder handler for endpoints that exist as a *route* (so the app boots
 * and the frontend gets a real, catchable error instead of a 404 for a path
 * it doesn't recognise) but have no real implementation yet.
 *
 * Replace with a real controller method when the module is built — see
 * BIVIO_FRONTEND_AUDIT.md §11 for the full per-module endpoint checklist this
 * skeleton was generated from.
 */
export function notImplemented(label: string) {
  return (_req: Request, res: Response) => {
    res.status(501).json({
      error: 'NOT_IMPLEMENTED',
      message: `${label} is not implemented yet`,
    });
  };
}
