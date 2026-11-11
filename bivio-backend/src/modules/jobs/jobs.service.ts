import { prisma } from '../../shared/prisma';
import { jobsRepository } from './jobs.repository';
import { assertTransition, JOB_TRANSITIONS } from '../../shared/stateMachines';
import {
  ConflictError, ForbiddenError, NotFoundError,
  PaymentRequiredError, ValidationError,
} from '../../shared/errors';
import { events } from '../../shared/events';
import type {
  CreateJobInput, SetHiringStagesInput, SetWeightageInput,
  JobListQuery,
} from './jobs.schema';
import type { JobType } from '@prisma/client';

async function getRecruiterOrThrow(userId: string) {
  const recruiter = await prisma.recruiterProfile.findUnique({ where: { userId } });
  if (!recruiter) throw new NotFoundError('Recruiter profile');
  return recruiter;
}

/** Resource-level ownership check — role middleware alone is not sufficient (IDOR). */
async function assertOwnsJob(jobId: string, recruiterId: string) {
  const job = await jobsRepository.findById(jobId);
  if (!job) throw new NotFoundError('Job');
  if (job.recruiterId !== recruiterId) throw new ForbiddenError();
  return job;
}

export const jobsService = {
  listPublic(query: JobListQuery) {
    return jobsRepository.findPublic(query);
  },

  async getById(jobId: string) {
    const job = await jobsRepository.findById(jobId);
    if (!job) throw new NotFoundError('Job');

    // Dynamically calculate total spent by recruiter
    const paidMilestones = await prisma.milestone.findMany({
      where: {
        contract: { clientId: job.recruiterId },
        status: 'PAID'
      },
      select: { amount: true }
    });
    const totalSpent = paidMilestones.reduce((sum, m) => sum + Number(m.amount), 0);

    // Dynamically calculate avg rating given by recruiter
    const reviews = await prisma.review.findMany({
      where: { reviewerId: job.recruiter.userId },
      select: { rating: true }
    });
    const avgRatingGiven = reviews.length > 0
      ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1))
      : 0.0;

    // Attach statistics to recruiter profile object in the response
    const jobWithStats = {
      ...job,
      recruiter: {
        ...job.recruiter,
        totalSpent,
        avgRatingGiven,
      }
    };

    // Fire-and-forget — not on the critical path.
    jobsRepository.incrementViewCount(jobId).catch(() => {});
    return jobWithStats;
  },

  async listForRecruiter(userId: string) {
    const recruiter = await getRecruiterOrThrow(userId);
    const jobs = await jobsRepository.findAllForRecruiter(recruiter.id);
    // Map Prisma's _count aggregate onto the flat applicantCount/proposalCount
    // fields the frontend type contract expects, so the jobs list page never
    // needs a per-card fetch loop to get these numbers.
    return jobs.map((job: any) => ({
      ...job,
      applicantCount: job._count?.applications ?? 0,
      proposalCount: job._count?.proposals ?? 0,
      _count: undefined,
    }));
  },

  // ── Step 1 — create in DRAFT. No payment step here at all (OQ-1). ───────
  async createDraft(userId: string, input: CreateJobInput) {
    const recruiter = await getRecruiterOrThrow(userId);
    return jobsRepository.createDraft(recruiter.id, input);
  },

  async updateSection(userId: string, jobId: string, data: Record<string, any>) {
    const recruiter = await getRecruiterOrThrow(userId);
    await assertOwnsJob(jobId, recruiter.id);

    // Clone incoming data to avoid mutating original
    const transformed: any = { ...data };
    // Convert date strings to Date objects (Prisma expects Date)
    if (typeof transformed.deadline === 'string' && transformed.deadline) {
      transformed.deadline = new Date(transformed.deadline);
    }
    if (typeof transformed.proposalDeadline === 'string' && transformed.proposalDeadline) {
      transformed.proposalDeadline = new Date(transformed.proposalDeadline);
    }

    // Separate skill relation fields from scalar updates
    const { skillIds, mandatorySkillIds, ...scalarData } = transformed;
    // Filter out undefined values from scalarData to avoid Prisma errors
    const filteredScalarData = Object.fromEntries(
      Object.entries(scalarData).filter(([, value]) => value !== undefined),
    );
    const jobUpdate: any = { ...filteredScalarData };


    if (Array.isArray(skillIds)) {
      jobUpdate.skills = {
        deleteMany: {},
        create: skillIds.map((sid: string) => ({
          skillId: sid,
          isMandatory: Array.isArray(mandatorySkillIds)
            ? mandatorySkillIds.includes(sid)
            : false,
        })),
      };
    } else if (Array.isArray(mandatorySkillIds)) {
      // No change to skill list, just adjust isMandatory flags
      const existing = await prisma.job.findUnique({
        where: { id: jobId },
        select: { skills: true },
      });
      jobUpdate.skills = {
        deleteMany: {},
        create: existing?.skills.map(s => ({
          skillId: s.skillId,
          isMandatory: mandatorySkillIds.includes(s.skillId),
        })) ?? [],
      };
    }

    // After preparing jobUpdate, check if there are any fields to update
    const hasUpdates = Object.keys(jobUpdate).length > 0;
    if (!hasUpdates) {
      // No fields to update; fetch and return existing job without performing an update
      return jobsRepository.findById(jobId);
    }
    // Proceed with update
    return jobsRepository.updateFields(jobId, jobUpdate as any);
  },

  // ── Step 3 — hiring stages (full-time only) ──────────────────────────────
  async setHiringStages(userId: string, jobId: string, input: SetHiringStagesInput) {
    const recruiter = await getRecruiterOrThrow(userId);
    const job = await assertOwnsJob(jobId, recruiter.id);
    if (job.jobType !== 'FULL_TIME') {
      throw new ValidationError('Hiring stages only apply to full-time jobs');
    }
    if (job.status !== 'DRAFT' && job.status !== 'CONFIGURING') {
      throw new ConflictError('Cannot modify stages once the job is published');
    }
    // Once any application exists in the pipeline, stages become structurally
    // immutable — changing them would orphan a candidate's currentStageId.
    const hasApplications = await jobsRepository.hasAnyApplicationsOrProposals(jobId);
    if (hasApplications) {
      throw new ConflictError('Cannot modify stages once candidates have applied');
    }

    const stages = await jobsRepository.setHiringStages(jobId, input);
    if (job.status === 'DRAFT') {
      await jobsRepository.updateStatus(jobId, 'CONFIGURING');
    }
    return stages;
  },

  // ── Step 4 — AI weightage, both job types ────────────────────────────────
  async setWeightage(userId: string, jobId: string, input: SetWeightageInput) {
    const recruiter = await getRecruiterOrThrow(userId);
    const job = await assertOwnsJob(jobId, recruiter.id);
    if (job.status === 'OPEN' || job.status === 'CLOSED') {
      throw new ConflictError('Cannot change weightage once the job is published');
    }

    const weightage = await jobsRepository.upsertWeightage(jobId, input);
    if (job.status === 'DRAFT') {
      await jobsRepository.updateStatus(jobId, 'CONFIGURING');
    }
    return weightage;
  },

  // ── Step 5 — publish. This is where OQ-1's one-time fee gate lives. ──────
  async publish(userId: string, jobId: string) {
    const recruiter = await getRecruiterOrThrow(userId);
    const job = await assertOwnsJob(jobId, recruiter.id);

    assertTransition(JOB_TRANSITIONS, job.status, 'OPEN', 'job');

    // OQ-1 — checked once per recruiter account, never per job.
    if (!recruiter.postingFeePaid) {
      throw new PaymentRequiredError(
        'Pay the one-time posting fee to publish your first job. This unlocks unlimited postings going forward.',
      );
    }

    if (job.jobType === 'FULL_TIME') {
      const hasScreening = job.hiringStages.some((s) => s.stageType === 'SCREENING');
      const hasOffer = job.hiringStages.some((s) => s.stageType === 'OFFER');
      if (!hasScreening || !hasOffer) {
        throw new ValidationError('Screening and Offer stages are required before publishing');
      }
    }

    if (!job.weightage) {
      throw new ValidationError('Set AI weightage before publishing');
    }
    const w = job.weightage;
    const sum =
      w.skillWeight + w.experienceWeight + w.educationWeight + w.domainWeight +
      w.practicalFitWeight + w.portfolioWeight + w.rateFitWeight +
      w.trackRecordWeight + w.availabilityWeight;
    if (sum !== 100) {
      throw new ValidationError(`AI weightage must sum to 100, currently ${sum}`);
    }

    const published = await jobsRepository.updateStatus(jobId, 'OPEN', { publishedAt: new Date() });
    await prisma.recruiterProfile.update({
      where: { id: recruiter.id },
      data: { jobsPostedCount: { increment: 1 } },
    });
    events.emit('JobPublished', { jobId });
    return published;
  },

  async close(userId: string, jobId: string) {
    const recruiter = await getRecruiterOrThrow(userId);
    const job = await assertOwnsJob(jobId, recruiter.id);
    assertTransition(JOB_TRANSITIONS, job.status, 'CLOSED', 'job');
    return jobsRepository.updateStatus(jobId, 'CLOSED');
  },

  async reopen(userId: string, jobId: string) {
    const recruiter = await getRecruiterOrThrow(userId);
    const job = await assertOwnsJob(jobId, recruiter.id);
    assertTransition(JOB_TRANSITIONS, job.status, 'OPEN', 'job');

    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    if (job.publishedAt && Date.now() - job.publishedAt.getTime() > THIRTY_DAYS_MS) {
      throw new ConflictError('This job was closed more than 30 days ago and cannot be reopened');
    }
    return jobsRepository.updateStatus(jobId, 'OPEN');
  },

  async cancel(userId: string, jobId: string, reason?: string) {
    const recruiter = await getRecruiterOrThrow(userId);
    const job = await assertOwnsJob(jobId, recruiter.id);

    // Freelance jobs with an active contract: cancelling the posting must
    // NEVER cancel the contract — they're independent lifecycles.
    if (job.jobType === 'FREELANCE') {
      const hasContract = await jobsRepository.hasAnyContract(jobId);
      if (hasContract) {
        return jobsRepository.updateStatus(jobId, 'CLOSED'); // soft-close, not cancel
      }
    }

    assertTransition(JOB_TRANSITIONS, job.status, 'CANCELLED', 'job');
    const cancelled = await jobsRepository.updateStatus(jobId, 'CANCELLED');

    if (job.jobType === 'FULL_TIME') {
      await jobsRepository.rejectAllInProgressApplications(
        jobId, reason ?? 'Job was cancelled by recruiter',
      );
    }
    return cancelled;
  },

  async duplicate(userId: string, jobId: string) {
    const recruiter = await getRecruiterOrThrow(userId);
    const job = await assertOwnsJob(jobId, recruiter.id);

    const skillIds = job.skills.map((s) => s.skillId);
    const mandatorySkillIds = job.skills.filter((s) => s.isMandatory).map((s) => s.skillId);

    const input: CreateJobInput =
      job.jobType === 'FULL_TIME'
        ? ({
            jobType: 'FULL_TIME', title: `${job.title} (copy)`, description: job.description,
            location: job.location ?? undefined, isRemote: job.isRemote, skillIds, mandatorySkillIds,
            currency: job.currency,
            employmentType: job.employmentType!, experienceLevel: job.experienceLevel!,
            department: job.department ?? undefined, responsibilities: job.responsibilities ?? undefined,
            salaryMin: Number(job.salaryMin), salaryMax: Number(job.salaryMax),
            salaryVisible: job.salaryVisible,
            minExperienceYears: Number(job.minExperienceYears ?? 0),
            maxExperienceYears: job.maxExperienceYears ? Number(job.maxExperienceYears) : undefined,
            minEducationLevel: job.minEducationLevel!, vacancies: job.vacancies,
            benefits: job.benefits, internalJobCode: undefined, // don't carry over internal code
          } as CreateJobInput)
        : ({
            jobType: 'FREELANCE', title: `${job.title} (copy)`, description: job.description,
            location: job.location ?? undefined, isRemote: job.isRemote, skillIds, mandatorySkillIds,
            currency: job.currency,
            deliverables: job.deliverables, budgetType: job.budgetType!, budget: Number(job.budget),
            freelanceExperienceLevel: job.freelanceExperienceLevel!,
            projectLengthEstimate: job.projectLengthEstimate!,
          } as CreateJobInput);

    return jobsRepository.createDraft(recruiter.id, input);
  },

  async extendDeadline(userId: string, jobId: string, deadline: string) {
    const recruiter = await getRecruiterOrThrow(userId);
    await assertOwnsJob(jobId, recruiter.id);
    return jobsRepository.updateFields(jobId, { deadline: new Date(deadline) });
  },
};
