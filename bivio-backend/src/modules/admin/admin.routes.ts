import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { blockDuringImpersonation } from '../../middleware/blockDuringImpersonation';
import { validate } from '../../middleware/validate';
import { prisma } from '../../shared/prisma';
import { adminController } from './admin.controller';
import {
  resolveDisputeSchema, escalateDisputeSchema, moderateUserSchema,
  approveKycSchema, rejectKycSchema, requestKycInfoSchema, impersonateSchema,
} from './admin.schema';

const router = Router();
router.use(authenticate, authorize('ADMIN'));

// ── Disputes ──────────────────────────────────────────────────────────────
router.get('/disputes', adminController.listDisputes);
router.get('/disputes/:id', adminController.getDispute);
router.patch('/disputes/:id/assign', adminController.assignDispute);
// Resolving a dispute moves money — blocked during impersonation.
router.post('/disputes/:id/resolve', blockDuringImpersonation, validate(resolveDisputeSchema), adminController.resolveDispute);
router.patch('/disputes/:id/escalate', validate(escalateDisputeSchema), adminController.escalateDispute);

// ── Users ─────────────────────────────────────────────────────────────────
router.get('/users', adminController.listUsers);
router.get('/users/:id', adminController.getUser);
// Moderating another user is blocked during impersonation — an impersonated
// session should never be able to warn/suspend/ban/unban anyone.
router.post('/users/:id/moderate', blockDuringImpersonation, validate(moderateUserSchema), adminController.moderateUser);
router.post('/users/:id/reset-password', blockDuringImpersonation, adminController.resetUserPassword);

// Impersonation itself is never available while already impersonating —
// no nested impersonation sessions.
router.post('/users/:id/impersonate', blockDuringImpersonation, validate(impersonateSchema), adminController.impersonate);

// ── Verifications ─────────────────────────────────────────────────────────
router.get('/verifications', adminController.listVerifications);
router.post('/verifications/:id/approve', validate(approveKycSchema), adminController.approveVerification);
router.post('/verifications/:id/reject', validate(rejectKycSchema), adminController.rejectVerification);
router.post('/verifications/:id/request-info', validate(requestKycInfoSchema), adminController.requestVerificationInfo);

// ── Dashboard Overview & Stats ──────────────────────────────────────────
router.get('/dashboard/stats', async (_req, res, next) => {
  try {
    const now = new Date();
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      openDisputesCount,
      staleDisputesCount,
      pendingKycCount,
      failedPayoutsCount,
      reportedUsersCount,
      reportedReviewsCount,
      activeUsersTotal,
      candidatesCount,
      recruitersCount,
      openJobsTotal,
      fullTimeJobsCount,
      freelanceJobsCount,
      activeContractsCount,
      heldEscrowAggregate,
      monthlyFees,
      totalDisputesCount,
      resolvedDisputes,
      latestDisputes,
      latestKycs,
      latestFees,
      latestAuditLogs,
    ] = await Promise.all([
      prisma.dispute.count({ where: { status: 'OPEN' } }),
      prisma.dispute.count({
        where: {
          status: 'UNDER_REVIEW',
          createdAt: { lte: fortyEightHoursAgo },
        },
      }),
      prisma.kycSubmission.count({ where: { status: 'PENDING' } }),
      prisma.payout.count({ where: { status: 'FAILED' } }),
      prisma.user.count({ where: { accountStatus: { in: ['SUSPENDED', 'BANNED'] } } }),
      prisma.review.count({ where: { isPublished: false } }),
      prisma.user.count({ where: { accountStatus: 'ACTIVE' } }),
      prisma.user.count({ where: { role: 'CANDIDATE', accountStatus: 'ACTIVE' } }),
      prisma.user.count({ where: { role: 'RECRUITER', accountStatus: 'ACTIVE' } }),
      prisma.job.count({ where: { status: 'OPEN' } }),
      prisma.job.count({ where: { status: 'OPEN', jobType: 'FULL_TIME' } }),
      prisma.job.count({ where: { status: 'OPEN', jobType: 'FREELANCE' } }),
      prisma.contract.count({ where: { status: 'ACTIVE' } }),
      prisma.escrow.aggregate({
        _sum: { amount: true },
        where: { status: { in: ['HELD', 'FROZEN'] } },
      }),
      prisma.platformFee.findMany({
        where: { chargedAt: { gte: startOfMonth } },
        select: { amount: true },
      }),
      prisma.dispute.count({ where: { status: { in: ['OPEN', 'UNDER_REVIEW'] } } }),
      prisma.dispute.findMany({
        where: { status: 'RESOLVED', resolvedAt: { not: null } },
        select: { createdAt: true, resolvedAt: true },
        take: 50,
      }),
      prisma.dispute.findMany({
        take: 4,
        orderBy: { createdAt: 'desc' },
        include: { raisedBy: true, milestone: { include: { contract: { include: { job: true } } } } },
      }),
      prisma.kycSubmission.findMany({
        take: 4,
        orderBy: { createdAt: 'desc' },
        include: { recruiter: { include: { user: true, company: true } } },
      }),
      prisma.platformFee.findMany({
        take: 4,
        orderBy: { chargedAt: 'desc' },
        include: { contract: { include: { job: true } } },
      }),
      prisma.auditLog.findMany({
        take: 4,
        orderBy: { createdAt: 'desc' },
        include: { actor: true },
      }),
    ]);

    let avgResolutionHours = 0;
    if (resolvedDisputes.length > 0) {
      const totalHours = resolvedDisputes.reduce((sum : number, d  : any) => {
        if (!d.resolvedAt) return sum;
        const diffMs = new Date(d.resolvedAt).getTime() - new Date(d.createdAt).getTime();
        return sum + Math.max(0.5, diffMs / (1000 * 60 * 60));
      }, 0);
      avgResolutionHours = Number((totalHours / resolvedDisputes.length).toFixed(1));
    }

    const monthlyRevenueSum = monthlyFees.reduce((sum : number, f : any) => sum + Number(f.amount), 0);
    const lockedEscrowAmount = Number(heldEscrowAggregate._sum.amount || 0);

    const activities: Array<{ id: string; text: string; details: string; timestamp: string; type: 'dispute' | 'kyc' | 'payout' | 'user' }> = [];

    latestDisputes.forEach((d : any) => {
      activities.push({
        id: `disp-${d.id}`,
        text: `Dispute ${d.status.toLowerCase().replace('_', ' ')} — ${d.milestone?.contract?.job?.title || 'Contract'}`,
        details: `Raised by ${d.raisedBy?.fullName || 'User'} (${d.reason ? d.reason.slice(0, 50) + '...' : 'Under arbitration'})`,
        timestamp: d.createdAt.toISOString(),
        type: 'dispute',
      });
    });

    latestKycs.forEach((k : any) => {
      const name = k.recruiter?.company?.name || k.recruiter?.user?.fullName || 'Recruiter';
      activities.push({
        id: `kyc-${k.id}`,
        text: `KYC ${k.status.toLowerCase()} — ${name}`,
        details: `${k.kycType || 'Business'} verification submission · Status: ${k.status}`,
        timestamp: k.createdAt.toISOString(),
        type: 'kyc',
      });
    });

    latestFees.forEach((f : any) => {
      activities.push({
        id: `fee-${f.id}`,
        text: `Platform fee collected: ₹${Number(f.amount).toLocaleString('en-IN')}`,
        details: `${f.feeType.replace('_', ' ')} on ${f.contract?.job?.title || 'Platform contract'}`,
        timestamp: f.chargedAt.toISOString(),
        type: 'payout',
      });
    });

    latestAuditLogs.forEach((a : any) => {
      activities.push({
        id: `audit-${a.id}`,
        text: `Audit action: ${a.action.replace('_', ' ')}`,
        details: `By ${a.actor?.fullName || 'Admin'} on ${a.entityType}`,
        timestamp: a.createdAt.toISOString(),
        type: 'user',
      });
    });

    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json({
      actionItems: {
        openDisputes: openDisputesCount,
        staleDisputes: staleDisputesCount,
        pendingKyc: pendingKycCount,
        failedPayouts: failedPayoutsCount,
        reportedUsers: reportedUsersCount,
        reportedReviews: reportedReviewsCount,
      },
      kpis: {
        activeUsers: {
          total: activeUsersTotal,
          candidates: candidatesCount,
          recruiters: recruitersCount,
        },
        openJobs: {
          total: openJobsTotal,
          fullTime: fullTimeJobsCount,
          freelance: freelanceJobsCount,
        },
        activeContracts: {
          total: activeContractsCount,
          escrowLockedInr: lockedEscrowAmount,
        },
        monthlyRevenue: {
          amountInr: monthlyRevenueSum,
        },
        openDisputes: {
          total: totalDisputesCount,
          unassigned: openDisputesCount,
          underReview: totalDisputesCount - openDisputesCount,
        },
        avgResolutionHours,
      },
      recentActivities: activities.slice(0, 8),
    });
  } catch (err) {
    next(err);
  }
});

// ── Financials ─────────────────────────────────────────────────────────────
router.get('/financials', async (req, res, next) => {
  try {
    const fees = await prisma.platformFee.findMany({
      include: {
        payment: { include: { payer: true } },
        contract: {
          include: {
            job: true,
            client: { include: { user: true, company: true } },
            freelancer: { include: { user: true } },
          },
        },
      },
      orderBy: { chargedAt: 'desc' },
    });

    const totalRevenue = fees.reduce((sum, f) => sum + Number(f.amount), 0);

    const byType = new Map<string, { amount: number; count: number }>();
    for (const f of fees) {
      const cur = byType.get(f.feeType) ?? { amount: 0, count: 0 };
      cur.amount += Number(f.amount);
      cur.count += 1;
      byType.set(f.feeType, cur);
    }

    const monthly = new Map<string, number>();
    for (const f of fees) {
      const key = f.chargedAt.toISOString().slice(0, 7);
      monthly.set(key, (monthly.get(key) ?? 0) + Number(f.amount));
    }

    const transactions = fees.map((f) => {
      const payerName = f.payment?.payer?.fullName || f.contract?.client?.user?.fullName || f.contract?.client?.company?.name || 'Client';
      let relatedEntity = 'Platform Fee';
      let relatedLink = '';

      if (f.feeType === 'FREELANCE_COMMISSION') {
        relatedEntity = f.contract?.job?.title || 'Freelance Contract Commission';
        relatedLink = f.contractId ? `/admin/disputes/${f.contractId}` : '';
      } else if (f.feeType === 'JOB_POSTING') {
        relatedEntity = f.contract?.job?.title || 'Job Posting Fee';
        relatedLink = f.payment?.payerUserId ? `/admin/users/${f.payment.payerUserId}` : '';
      } else if (f.feeType === 'CANDIDATE_REGISTRATION') {
        relatedEntity = 'Candidate Profile Unlock';
        relatedLink = f.payment?.payerUserId ? `/admin/users/${f.payment.payerUserId}` : '';
      }

      return {
        id: f.id,
        date: f.chargedAt.toISOString().slice(0, 10),
        feeType: f.feeType,
        amount: Number(f.amount),
        relatedEntity,
        relatedLink,
        payerName,
      };
    });

    res.json({
      totalRevenue: totalRevenue.toFixed(2),
      currency: 'INR',
      byFeeType: [...byType.entries()].map(([feeType, v]) => ({
        feeType,
        amount: v.amount.toFixed(2),
        count: v.count,
      })),
      monthly: [...monthly.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, amount]) => ({ month, amount: amount.toFixed(2) })),
      transactions,
    });
  } catch (err) {
    next(err);
  }
});

// ── Settings ─────────────────────────────────────────────────────────────
const DEFAULT_SETTINGS = [
  // Fees
  { key: 'JOB_POSTING_FEE', label: 'Job posting fee', description: 'Charged to recruiter accounts before a job listing becomes public.', type: 'DECIMAL' as const, section: 'FEES' as const, value: '2500' },
  { key: 'CANDIDATE_PROFILE_FEE', label: 'Candidate registration fee', description: 'One-time registration unlock fee for candidate profile visibility.', type: 'DECIMAL' as const, section: 'FEES' as const, value: '499' },
  { key: 'PLATFORM_FEE_PERCENT', label: 'Freelance platform commission', description: 'Percentage taken on each freelance milestone release payment. Changing this rate only applies to new contracts created after the change. Existing contracts keep the rate they were signed at.', type: 'PERCENTAGE' as const, section: 'FEES' as const, value: '10' },
  
  // Thresholds
  { key: 'KYC_THRESHOLD', label: 'KYC required above contract value', description: 'Threshold amount above which identity verification check becomes mandatory.', type: 'DECIMAL' as const, section: 'THRESHOLDS' as const, value: '500000' },
  { key: 'PAYOUT_MINIMUM', label: 'Payout minimum', description: 'Minimum allowed wallet balance required to request a payout transfer.', type: 'DECIMAL' as const, section: 'THRESHOLDS' as const, value: '500' },
  { key: 'OFFER_EXPIRY_DAYS', label: 'Offer expiry default', description: 'Duration in days after which a sent job offer automatically expires.', type: 'INTEGER' as const, section: 'THRESHOLDS' as const, value: '7' },
  { key: 'INVITATION_EXPIRY_DAYS', label: 'Invitation expiry default', description: 'Duration in days after which an interview invitation automatically expires.', type: 'INTEGER' as const, section: 'THRESHOLDS' as const, value: '7' },
  { key: 'REVIEW_PUBLISH_DAYS', label: 'Review double-blind window', description: 'Days reviews remain hidden until published or both parties write reviews.', type: 'INTEGER' as const, section: 'THRESHOLDS' as const, value: '14' },
  { key: 'DISPUTE_SLA_HOURS', label: 'Dispute resolution SLA', description: 'Target hours within which an administrator resolves active disputes.', type: 'INTEGER' as const, section: 'THRESHOLDS' as const, value: '48' },

  // Feature Flags
  { key: 'FEATURE_FREELANCER_SEARCH', label: 'Freelancer discovery page enabled', description: 'Toggles visibility of recruiter freelancer discovery search dashboard.', type: 'BOOLEAN' as const, section: 'FLAGS' as const, value: 'true' },
  { key: 'FEATURE_CHAT', label: 'Chat enabled', description: 'Platform-wide chat killswitch in case of server system/WebSockets instability.', type: 'BOOLEAN' as const, section: 'FLAGS' as const, value: 'true' },
  { key: 'FEATURE_REGISTRATIONS_OPEN', label: 'New registrations enabled', description: 'Emergency shutdown toggle for new accounts creation under spam/abuse spikes.', type: 'BOOLEAN' as const, section: 'FLAGS' as const, value: 'true' },

  // Review Policy
  { key: 'REVIEW_MIN_RATING', label: 'Minimum rating value', description: 'Fixed absolute lower bounds score for platform reviews.', type: 'INTEGER' as const, section: 'POLICY' as const, value: '1' },
  { key: 'REVIEW_MAX_RATING', label: 'Maximum rating value', description: 'Fixed absolute upper bounds score for platform reviews.', type: 'INTEGER' as const, section: 'POLICY' as const, value: '5' },
  { key: 'REVIEW_EDIT_ALLOWED', label: 'Allow review edits before publish', description: 'Permits modification of written feedback before public disclosure.', type: 'BOOLEAN' as const, section: 'POLICY' as const, value: 'false' },
];

router.get('/settings', async (_req, res, next) => {
  try {
    const existing = await prisma.platformSetting.findMany();
    const existingKeys = new Set(existing.map((s) => s.key));

    // Auto-seed any missing standard schemas
    const missing = DEFAULT_SETTINGS.filter((d) => !existingKeys.has(d.key));
    if (missing.length > 0) {
      for (const item of missing) {
        await prisma.platformSetting.upsert({
          where: { key: item.key },
          update: {},
          create: {
            key: item.key,
            label: item.label,
            description: item.description,
            type: item.type,
            section: item.section,
            value: item.value,
          },
        });
      }
    }

    const settings = await prisma.platformSetting.findMany({ orderBy: [{ section: 'asc' }, { key: 'asc' }] });
    res.json(settings);
  } catch (err) {
    next(err);
  }
});

router.get('/settings/audit-logs', async (_req, res, next) => {
  try {
    const logs = await prisma.auditLog.findMany({
      where: { entityType: 'PlatformSetting' },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { actor: true },
    });
    res.json(logs);
  } catch (err) {
    next(err);
  }
});

router.put('/settings/:key', async (req, res, next) => {
  try {
    const defaultItem = DEFAULT_SETTINGS.find((s) => s.key === req.params.key);
    const updated = await prisma.platformSetting.upsert({
      where: { key: req.params.key },
      update: { value: String(req.body.value ?? '') },
      create: {
        key: req.params.key,
        label: defaultItem?.label || req.params.key,
        description: defaultItem?.description || '',
        type: defaultItem?.type || 'DECIMAL',
        section: defaultItem?.section || 'FEES',
        value: String(req.body.value ?? ''),
      },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: (req as any).user?.id,
        entityType: 'PlatformSetting',
        entityId: updated.id,
        action: 'UPDATE_VALUE',
        diff: { key: req.params.key, label: updated.label, newValue: req.body.value },
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export const adminRoutes = router;
