import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { env } from '../../config/env';
import { AuthenticatedRequest } from '../../middleware/authenticate';
import { UnauthorizedError } from '../../shared/errors';

const REFRESH_COOKIE = 'bivio_refresh_token';

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: env.NODE_ENV === 'production',
  path: '/api/auth',
};

export const authController = {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.register(req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken, ...rest } = await authService.login(req.body);
      res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions);
      res.json(rest);
    } catch (err) {
      res.clearCookie(REFRESH_COOKIE, cookieOptions);
      next(err);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.cookies?.[REFRESH_COOKIE];
      if (!token) throw new UnauthorizedError('No session found');
      const result = await authService.refresh(token);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async logout(_req: Request, res: Response) {
    res.clearCookie(REFRESH_COOKIE, cookieOptions);
    res.json({ ok: true });
  },

  async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.verifyEmail(req.body.token);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async resendVerification(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.resendVerification(req.body.email);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.forgotPassword(req.body.email);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.resetPassword(req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await authService.getMe(req.user!.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async googleLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken, ...rest } = await authService.googleLogin(req.body);
      res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions);
      res.json(rest);
    } catch (err) {
      res.clearCookie(REFRESH_COOKIE, cookieOptions);
      next(err);
    }
  },
};
