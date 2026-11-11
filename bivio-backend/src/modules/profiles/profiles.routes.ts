import { Router } from 'express';
import { authenticate, AuthenticatedRequest } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { prisma } from '../../shared/prisma';
import { paymentGateway } from '../../shared/paymentGateway';
import { profilesController } from './profiles.controller';
import {
  updateCandidateProfileSchema, uploadResumeSchema, saveSkillsSchema,
  saveWorkExperienceSchema, saveEducationSchema, saveCertificationsSchema, saveLanguagesSchema,
  savePortfolioSchema, portfolioProjectSchema, portfolioServiceSchema,
  updateRecruiterProfileSchema, updateCompanySchema, verifyPaymentMethodSchema, submitKycSchema,
} from './profiles.schema';

const router = Router();
router.use(['/candidates', '/recruiters'], authenticate);

// ── Public configuration ──────────────────────────────────────────────────
router.get('/settings/public', async (req, res, next) => {
  try {
    const keys = [
      'JOB_POSTING_FEE',
      'CANDIDATE_PROFILE_FEE',
      'PLATFORM_FEE_PERCENT',
      'KYC_THRESHOLD',
      'PAYOUT_MINIMUM',
      'OFFER_EXPIRY_DAYS',
      'INVITATION_EXPIRY_DAYS',
      'REVIEW_PUBLISH_DAYS',
      'DISPUTE_SLA_HOURS',
      'FEATURE_FREELANCER_SEARCH',
      'FEATURE_CHAT',
      'FEATURE_REGISTRATIONS_OPEN',
      'REVIEW_MIN_RATING',
      'REVIEW_MAX_RATING',
      'REVIEW_EDIT_ALLOWED',
    ];
    const settings = await prisma.platformSetting.findMany({
      where: { key: { in: keys } },
    });
    
    // Default fallback values if not seeded
    const response: Record<string, any> = {
      JOB_POSTING_FEE: 2500,
      CANDIDATE_PROFILE_FEE: 499,
      PLATFORM_FEE_PERCENT: 10,
      KYC_THRESHOLD: 500000,
      PAYOUT_MINIMUM: 500,
      OFFER_EXPIRY_DAYS: 7,
      INVITATION_EXPIRY_DAYS: 7,
      REVIEW_PUBLISH_DAYS: 14,
      DISPUTE_SLA_HOURS: 48,
      FEATURE_FREELANCER_SEARCH: true,
      FEATURE_CHAT: true,
      FEATURE_REGISTRATIONS_OPEN: true,
      REVIEW_MIN_RATING: 1,
      REVIEW_MAX_RATING: 5,
      REVIEW_EDIT_ALLOWED: false,
    };
    
    settings.forEach((s) => {
      if (s.value === 'true') {
        response[s.key] = true;
      } else if (s.value === 'false') {
        response[s.key] = false;
      } else {
        const val = Number(s.value);
        if (!Number.isNaN(val)) {
          response[s.key] = val;
        } else {
          response[s.key] = s.value;
        }
      }
    });
    
    res.json(response);
  } catch (err) {
    next(err);
  }
});

// ── Candidate profile ────────────────────────────────────────────────────
router.get('/candidates/me', authorize('CANDIDATE'), profilesController.getCandidateProfile);
router.patch('/candidates/me', authorize('CANDIDATE'), validate(updateCandidateProfileSchema), profilesController.updateCandidateProfile);

// ── Resumes ───────────────────────────────────────────────────────────────
router.post('/candidates/me/resumes/upload-file', authorize('CANDIDATE'), (req, res, next) => {
  try {
    const { fileName, base64Data } = req.body;
    if (!fileName || !base64Data) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'fileName and base64Data are required' });
    }
    const fs = require('node:fs');
    const path = require('node:path');
    const buffer = Buffer.from(base64Data, 'base64');
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const safeFileName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
    const filePath = path.join(uploadDir, safeFileName);
    fs.writeFileSync(filePath, buffer);

    const fileUrl = `http://localhost:4000/uploads/${safeFileName}`;
    res.json({ fileUrl });
  } catch (err) {
    next(err);
  }
});

router.post('/candidates/me/resumes', authorize('CANDIDATE'), validate(uploadResumeSchema), profilesController.uploadResume);
router.patch('/candidates/me/resumes/:id/primary', authorize('CANDIDATE'), profilesController.setPrimaryResume);

// ── Structured profile sections ──────────────────────────────────────────
router.put('/candidates/me/skills', authorize('CANDIDATE'), validate(saveSkillsSchema), profilesController.saveSkills);
router.put('/candidates/me/work-experience', authorize('CANDIDATE'), validate(saveWorkExperienceSchema), profilesController.saveWorkExperience);
router.put('/candidates/me/education', authorize('CANDIDATE'), validate(saveEducationSchema), profilesController.saveEducation);
router.put('/candidates/me/certifications', authorize('CANDIDATE'), validate(saveCertificationsSchema), profilesController.saveCertifications);
router.put('/candidates/me/languages', authorize('CANDIDATE'), validate(saveLanguagesSchema), profilesController.saveLanguages);

// ── Freelance portfolio ───────────────────────────────────────────────────
router.get('/candidates/me/portfolio', authorize('CANDIDATE'), profilesController.getPortfolio);
router.put('/candidates/me/portfolio', authorize('CANDIDATE'), validate(savePortfolioSchema), profilesController.savePortfolio);
router.post('/candidates/me/portfolio/projects', authorize('CANDIDATE'), validate(portfolioProjectSchema), profilesController.addProject);
router.patch('/candidates/me/portfolio/projects/:id', authorize('CANDIDATE'), validate(portfolioProjectSchema.partial()), profilesController.updateProject);
router.delete('/candidates/me/portfolio/projects/:id', authorize('CANDIDATE'), profilesController.deleteProject);
router.post('/candidates/me/portfolio/services', authorize('CANDIDATE'), validate(portfolioServiceSchema), profilesController.addService); // OQ-10: in scope
router.patch('/candidates/me/portfolio/services/:id', authorize('CANDIDATE'), validate(portfolioServiceSchema.partial()), profilesController.updateService);
router.delete('/candidates/me/portfolio/services/:id', authorize('CANDIDATE'), profilesController.deleteService);
router.get('/candidates/me/portfolio/reviews', authorize('CANDIDATE'), profilesController.getPortfolioReviews);

// ── Recruiter profile ────────────────────────────────────────────────────
router.get('/recruiters/me', authorize('RECRUITER'), profilesController.getRecruiterProfile);
router.get('/recruiters/me/team', authorize('RECRUITER'), profilesController.getRecruiterTeam);
router.patch('/recruiters/me', authorize('RECRUITER'), validate(updateRecruiterProfileSchema), profilesController.updateRecruiterProfile);
router.patch('/recruiters/me/company', authorize('RECRUITER'), validate(updateCompanySchema), profilesController.updateCompany);

router.post('/recruiters/me/offers/upload-file', authorize('RECRUITER'), (req, res, next) => {
  try {
    const { fileName, base64Data } = req.body;
    if (!fileName || !base64Data) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'fileName and base64Data are required' });
    }
    const fs = require('node:fs');
    const path = require('node:path');
    const buffer = Buffer.from(base64Data, 'base64');
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const safeFileName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
    const filePath = path.join(uploadDir, safeFileName);
    fs.writeFileSync(filePath, buffer);

    const fileUrl = `http://localhost:4000/uploads/${safeFileName}`;
    res.json({ fileUrl });
  } catch (err) {
    next(err);
  }
});

// ── Verification — payment method + KYC submission (creates the rows the
// admin module's /admin/verifications queue manages) ────────────────────
router.post('/recruiters/me/payment-method/verify', authorize('RECRUITER'), validate(verifyPaymentMethodSchema), profilesController.verifyPaymentMethod);
router.post('/recruiters/me/payment-method/verify-session', authorize('RECRUITER'), profilesController.verifyCheckoutSession);
router.post('/recruiters/me/kyc', authorize('RECRUITER'), validate(submitKycSchema), profilesController.submitKyc);
router.get('/candidates', authorize('RECRUITER'), profilesController.searchCandidates);

// OQ-1 — one-time posting fee. Unchanged from the Jobs-module integration
// pass: mock gateway success today, swap for a real webhook-driven flow once
// payment gateway integration lands. Kept inline rather than moved into the
// service layer since it's a payment-mock concern, not a profile-editing one.
router.post('/recruiters/me/posting-fee/confirm', authorize('RECRUITER'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const recruiter = await prisma.recruiterProfile.findUnique({ where: { userId: req.user!.id } });
    if (!recruiter) return res.status(404).json({ error: 'NOT_FOUND', message: 'Recruiter profile not found' });
    if (recruiter.postingFeePaid) {
      return res.json({ postingFeePaid: true, alreadyPaid: true });
    }

    const setting = await prisma.platformSetting.findUnique({ where: { key: 'JOB_POSTING_FEE' } });
    const inrAmount = Number(setting?.value) || 2500;
    const usdAmount = Number((inrAmount / 83).toFixed(2));

    const { sessionId, jobId } = req.body;

    if (sessionId) {
      // Check if this payment session was already processed to make it idempotent
      const existingPayment = await prisma.payment.findUnique({ where: { gatewayRef: sessionId } });
      if (existingPayment) {
        if (!recruiter.postingFeePaid) {
          await prisma.recruiterProfile.update({
            where: { id: recruiter.id },
            data: { postingFeePaid: true, postingFeePaidAt: existingPayment.paidAt },
          });
        }
        return res.json({ postingFeePaid: true, alreadyPaid: true });
      }

      if (sessionId.startsWith('mock_')) {
        await prisma.$transaction(async (tx) => {
          const payment = await tx.payment.create({
            data: {
              payerUserId: req.user!.id,
              amount: usdAmount,
              purpose: 'JOB_POSTING_FEE',
              status: 'SUCCESS',
              gateway: 'mock',
              gatewayRef: sessionId,
              paidAt: new Date(),
            },
          });
          await tx.recruiterProfile.update({
            where: { id: recruiter.id },
            data: { postingFeePaid: true, postingFeePaidAt: new Date() },
          });
          await tx.platformFee.create({
            data: { paymentId: payment.id, feeType: 'JOB_POSTING', amount: usdAmount },
          });
        });
        return res.json({ postingFeePaid: true, alreadyPaid: false });
      }

      // Verify real Stripe Checkout Session
      const session = await paymentGateway.retrieveSession(sessionId);
      if (session.payment_status === 'paid') {
        await prisma.$transaction(async (tx) => {
          const payment = await tx.payment.create({
            data: {
              payerUserId: req.user!.id,
              amount: usdAmount,
              purpose: 'JOB_POSTING_FEE',
              status: 'SUCCESS',
              gateway: 'stripe',
              gatewayRef: sessionId,
              paidAt: new Date(),
            },
          });
          await tx.recruiterProfile.update({
            where: { id: recruiter.id },
            data: { postingFeePaid: true, postingFeePaidAt: new Date() },
          });
          await tx.platformFee.create({
            data: { paymentId: payment.id, feeType: 'JOB_POSTING', amount: usdAmount },
          });
        });
        return res.json({ postingFeePaid: true, alreadyPaid: false });
      } else {
        return res.status(400).json({ error: 'PAYMENT_FAILED', message: 'Stripe payment was not successful' });
      }
    }

    // Initiate Stripe Checkout session (or mock)
    const successUrl = jobId
      ? `${process.env.FRONTEND_URL || 'http://localhost:3000'}/recruiter/jobs/new?id=${jobId}&step=1&session_id={CHECKOUT_SESSION_ID}`
      : `${process.env.FRONTEND_URL || 'http://localhost:3000'}/recruiter/jobs?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = jobId
      ? `${process.env.FRONTEND_URL || 'http://localhost:3000'}/recruiter/jobs/new?id=${jobId}&step=1&cancel=true`
      : `${process.env.FRONTEND_URL || 'http://localhost:3000'}/recruiter/jobs?cancel=true`;

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });

    const orderResult = await paymentGateway.createOrder({
      amount: usdAmount,
      currency: 'USD',
      purpose: 'JOB_POSTING_FEE',
      referenceId: recruiter.id,
      email: user?.email || undefined,
      successUrl,
      cancelUrl,
    });

    if (orderResult.checkoutUrl) {
      return res.json({ postingFeePaid: false, checkoutUrl: orderResult.checkoutUrl });
    }

    // Fallback if Stripe is disabled
    await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          payerUserId: req.user!.id,
          amount: usdAmount,
          purpose: 'JOB_POSTING_FEE',
          status: 'SUCCESS',
          gateway: 'mock',
          gatewayRef: orderResult.orderId,
          paidAt: new Date(),
        },
      });
      await tx.recruiterProfile.update({
        where: { id: recruiter.id },
        data: { postingFeePaid: true, postingFeePaidAt: new Date() },
      });
      await tx.platformFee.create({
        data: { paymentId: payment.id, feeType: 'JOB_POSTING', amount: usdAmount },
      });
    });

    return res.json({ postingFeePaid: true, alreadyPaid: false });
  } catch (err) { next(err); }
});

router.post('/candidates/me/profile-fee/confirm', authorize('CANDIDATE'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const candidate = await prisma.candidateProfile.findUnique({ where: { userId: req.user!.id } });
    if (!candidate) return res.status(404).json({ error: 'NOT_FOUND', message: 'Candidate profile not found' });
    if (candidate.fullTimeFeePaid) {
      return res.json({ fullTimeFeePaid: true, alreadyPaid: true });
    }

    const { sessionId, jobId } = req.body;

    const setting = await prisma.platformSetting.findUnique({ where: { key: 'CANDIDATE_PROFILE_FEE' } });
    const inrAmount = Number(setting?.value) || 499;
    const amount = Number((inrAmount / 83).toFixed(2));
    const currency = 'USD';

    if (sessionId) {
      // Check if this payment session was already processed to make it idempotent
      const existingPayment = await prisma.payment.findUnique({ where: { gatewayRef: sessionId } });
      if (existingPayment) {
        if (!candidate.fullTimeFeePaid) {
          await prisma.candidateProfile.update({
            where: { id: candidate.id },
            data: { fullTimeFeePaid: true },
          });
        }
        return res.json({ fullTimeFeePaid: true, alreadyPaid: true });
      }

      if (sessionId.startsWith('mock_')) {
        await prisma.$transaction(async (tx) => {
          const payment = await tx.payment.create({
            data: {
              payerUserId: req.user!.id,
              amount,
              currency,
              purpose: 'CANDIDATE_PROFILE_FEE',
              status: 'SUCCESS',
              gateway: 'mock',
              gatewayRef: sessionId,
              paidAt: new Date(),
            },
          });
          await tx.candidateProfile.update({
            where: { id: candidate.id },
            data: { fullTimeFeePaid: true },
          });
          await tx.platformFee.create({
            data: { paymentId: payment.id, feeType: 'CANDIDATE_REGISTRATION', amount },
          });
        });
        return res.json({ fullTimeFeePaid: true, alreadyPaid: false });
      }

      // Verify real Stripe Checkout Session
      const session = await paymentGateway.retrieveSession(sessionId);
      if (session.payment_status === 'paid') {
        await prisma.$transaction(async (tx) => {
          const payment = await tx.payment.create({
            data: {
              payerUserId: req.user!.id,
              amount,
              currency,
              purpose: 'CANDIDATE_PROFILE_FEE',
              status: 'SUCCESS',
              gateway: 'stripe',
              gatewayRef: sessionId,
              paidAt: new Date(),
            },
          });
          await tx.candidateProfile.update({
            where: { id: candidate.id },
            data: { fullTimeFeePaid: true },
          });
          await tx.platformFee.create({
            data: { paymentId: payment.id, feeType: 'CANDIDATE_REGISTRATION', amount },
          });
        });
        return res.json({ fullTimeFeePaid: true, alreadyPaid: false });
      } else {
        return res.status(400).json({ error: 'PAYMENT_FAILED', message: 'Stripe payment was not successful' });
      }
    }

    // Initiate Stripe Checkout session (or mock)
    const successUrl = jobId
      ? `${process.env.FRONTEND_URL || 'http://localhost:3000'}/jobs/${jobId}?session_id={CHECKOUT_SESSION_ID}`
      : `${process.env.FRONTEND_URL || 'http://localhost:3000'}/profile?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = jobId
      ? `${process.env.FRONTEND_URL || 'http://localhost:3000'}/jobs/${jobId}?cancel=true`
      : `${process.env.FRONTEND_URL || 'http://localhost:3000'}/profile?cancel=true`;

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });

    const orderResult = await paymentGateway.createOrder({
      amount,
      currency,
      purpose: 'CANDIDATE_PROFILE_FEE',
      referenceId: candidate.id,
      email: user?.email || undefined,
      successUrl,
      cancelUrl,
    });

    if (orderResult.checkoutUrl) {
      return res.json({ fullTimeFeePaid: false, checkoutUrl: orderResult.checkoutUrl });
    }

    // Fallback if Stripe is disabled
    await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          payerUserId: req.user!.id,
          amount,
          currency,
          purpose: 'CANDIDATE_PROFILE_FEE',
          status: 'SUCCESS',
          gateway: 'mock',
          gatewayRef: orderResult.orderId,
          paidAt: new Date(),
        },
      });
      await tx.candidateProfile.update({
        where: { id: candidate.id },
        data: { fullTimeFeePaid: true },
      });
      await tx.platformFee.create({
        data: { paymentId: payment.id, feeType: 'CANDIDATE_REGISTRATION', amount },
      });
    });

    return res.json({ fullTimeFeePaid: true, alreadyPaid: false });
  } catch (err) { next(err); }
});

// ── Shared: skills lookup ──────────────────────────────────────────────────
router.get('/skills', profilesController.searchSkills);

export const profilesRoutes = router;
