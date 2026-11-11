import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';

// Patch BigInt serialization in JSON responses
(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

import { authRoutes, meRoute } from './modules/auth/auth.routes';
import { profilesRoutes } from './modules/profiles/profiles.routes';
import { jobsRoutes } from './modules/jobs/jobs.routes';
import { matchingRoutes } from './modules/matching/matching.routes';
import { hiringRoutes } from './modules/hiring/hiring.routes';
import { freelanceRoutes } from './modules/freelance/freelance.routes';
import { paymentsRoutes } from './modules/payments/payments.routes';
import { messagingRoutes } from './modules/messaging/messaging.routes';
import { adminRoutes } from './modules/admin/admin.routes';
import { supportRoutes, adminSupportRoutes } from './modules/support/support.routes';

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true, // required for the httpOnly refresh cookie
  }),
);

app.use('/uploads', express.static('uploads'));

// The `verify` callback stashes the exact raw bytes onto req.rawBody before
// Express parses them into JSON. HMAC webhook signature verification
// (src/shared/paymentGateway.ts) MUST run against these original bytes —
// re-serializing the parsed object can produce a different byte sequence
// than what was actually signed (key order, whitespace), which would make
// a correct signature fail verification for no real reason.
app.use(
  express.json({
    limit: '10mb',
    verify: (req, _res, buf) => {
      (req as express.Request & { rawBody?: string }).rawBody = buf.toString('utf8');
    },
  }),
);
app.use(cookieParser());

app.get('/health', (_req, res) => res.json({ ok: true }));

// Route prefixes match the frontend's RTK Query endpoint paths exactly —
// see BIVIO_FRONTEND_AUDIT.md §11 for the full per-module endpoint mapping.
app.use('/api/auth', authRoutes);
app.use('/api/me', meRoute);
app.use('/api', profilesRoutes);   // /candidates/me, /recruiters/me, /skills
app.use('/api', jobsRoutes);       // /jobs, /recruiter/jobs
app.use('/api', matchingRoutes);   // /jobs/:id/candidates, /match-scores/compute
app.use('/api', hiringRoutes);     // /applications, /invitations, /offers, /interviews
app.use('/api', freelanceRoutes);  // /proposals, /contracts, /milestones
app.use('/api', paymentsRoutes);   // /wallet, /payouts, /webhooks/payment
app.use('/api', messagingRoutes);  // /notifications, /chat
app.use('/api/support', supportRoutes);
app.use('/api/admin/support', adminSupportRoutes);
app.use('/api/admin', adminRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'NOT_FOUND', message: `No route for ${req.method} ${req.path}` });
});

// MUST be registered last.
app.use(errorHandler);
