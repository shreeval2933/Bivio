import { Router } from 'express';
import { authController } from './auth.controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/authenticate';
import { rateLimit } from '../../middleware/rateLimit';
import {
  registerSchema, loginSchema, forgotPasswordSchema,
  resetPasswordSchema, verifyEmailSchema, resendVerificationSchema,
} from './auth.schema';

const router = Router();

router.post('/register', validate(registerSchema), authController.register);

router.post(
  '/login',
  rateLimit({ windowSeconds: 60, max: 10 }), // brute-force guard
  validate(loginSchema),
  authController.login,
);

router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.post('/verify-email', validate(verifyEmailSchema), authController.verifyEmail);
router.post('/resend-verification', validate(resendVerificationSchema), authController.resendVerification);

router.post(
  '/forgot-password',
  rateLimit({ windowSeconds: 300, max: 5 }),
  validate(forgotPasswordSchema),
  authController.forgotPassword,
);

router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);
router.post('/google', authController.googleLogin);

export const authRoutes = router;

// GET /me lives on a separate top-level route (not /auth/me) to match the
// frontend contract (`useGetMeQuery` calls GET /me) — wired in app.ts.
export const meRoute = Router();
meRoute.get('/', authenticate, authController.getMe);
