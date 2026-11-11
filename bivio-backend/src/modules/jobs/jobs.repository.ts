import { prisma } from '../../shared/prisma';
import { Prisma, JobStatus, JobType } from '@prisma/client';
import type { CreateJobInput, SetHiringStagesInput, SetWeightageInput } from './jobs.schema';

const JOB_INCLUDE = {
  company: true,
  recruiter: { include: { user: true } },
  skills: { include: { skill: true } },
  hiringStages: { orderBy: { sequence: 'asc' as const } },
  weightage: true,
} satisfies Prisma.JobInclude;

export const jobsRepository = {
  findById(id: string) {
    return prisma.job.findUnique({ where: { id }, include: JOB_INCLUDE });
  },

  findByIdOrThrow(id: string) {
    return prisma.job.findUniqueOrThrow({ where: { id }, include: JOB_INCLUDE });
  },

  async findPublic(params: {
    jobType?: JobType; location?: string; isRemote?: boolean; q?: string;
    page: number; limit: number;
  }) {
    const where: Prisma.JobWhereInput = { status: 'OPEN' };
    if (params.jobType) where.jobType = params.jobType;
    if (params.isRemote) where.isRemote = true;
    if (params.location) where.location = { contains: params.location, mode: 'insensitive' };
    if (params.q) {
      where.OR = [
        { title: { contains: params.q, mode: 'insensitive' } },
        { skills: { some: { skill: { name: { contains: params.q, mode: 'insensitive' } } } } },
      ];
    }

    const skip = (params.page - 1) * params.limit;
    const [data, total] = await Promise.all([
      prisma.job.findMany({
        where, include: JOB_INCLUDE, orderBy: { publishedAt: 'desc' },
        take: params.limit, skip,
      }),
      prisma.job.count({ where }),
    ]);
    return { data, total, page: params.page, limit: params.limit };
  },

  findAllForRecruiter(recruiterId: string) {
    return prisma.job.findMany({
      where: { recruiterId },
      include: {
        ...JOB_INCLUDE,
        _count: { select: { applications: true, proposals: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  incrementViewCount(jobId: string) {
    return prisma.job.update({ where: { id: jobId }, data: { viewCount: { increment: 1 } } });
  },

  async createDraft(recruiterId: string, input: CreateJobInput) {
    const { skillIds, mandatorySkillIds, ...rest } = input;

    const recruiterProfile = await prisma.recruiterProfile.findUnique({
      where: { id: recruiterId },
      select: { companyId: true }
    });

    return prisma.job.create({
      data: {
        recruiterId,
        companyId: recruiterProfile?.companyId,
        status: 'DRAFT',
        title: rest.title,
        description: rest.description,
        jobType: rest.jobType,
        location: rest.location,
        isRemote: rest.isRemote,
        currency: rest.currency,
        deadline: rest.deadline ? new Date(rest.deadline) : undefined,

        ...(rest.jobType === 'FULL_TIME'
          ? {
              employmentType: rest.employmentType,
              experienceLevel: rest.experienceLevel,
              department: rest.department,
              responsibilities: rest.responsibilities,
              salaryMin: rest.salaryMin,
              salaryMax: rest.salaryMax,
              salaryVisible: rest.salaryVisible,
              minExperienceYears: rest.minExperienceYears,
              maxExperienceYears: rest.maxExperienceYears,
              minEducationLevel: rest.minEducationLevel,
              noticePeriodPreference: rest.noticePeriodPreference,
              vacancies: rest.vacancies,
              benefits: rest.benefits,
              internalJobCode: rest.internalJobCode,
            }
          : {
              deliverables: rest.deliverables,
              attachments: (rest as any).attachments || [],
              budgetType: rest.budgetType,
              budget: rest.budget,
              freelanceExperienceLevel: rest.freelanceExperienceLevel,
              projectLengthEstimate: rest.projectLengthEstimate,
              proposalDeadline: rest.proposalDeadline ? new Date(rest.proposalDeadline) : undefined,
            }),

        skills: {
          create: skillIds.map((skillId: string) => ({
            skillId,
            isMandatory: mandatorySkillIds.includes(skillId),
          })),
        },
      },
      include: JOB_INCLUDE,
    });
  },

  updateStatus(jobId: string, status: JobStatus, extra?: Prisma.JobUpdateInput) {
    return prisma.job.update({ where: { id: jobId }, data: { status, ...extra } });
  },

  updateFields(jobId: string, data: Prisma.JobUpdateInput) {
    return prisma.job.update({ where: { id: jobId }, data, include: JOB_INCLUDE });
  },

  /**
   * Replaces the job's configurable hiring stages, preserving the two
   * system-managed anchors (SCREENING first, OFFER last) which are created
   * once and never touched again by this method.
   */
  async setHiringStages(jobId: string, input: SetHiringStagesInput) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.hiringStage.findMany({ where: { jobId }, orderBy: { sequence: 'asc' } });
      const screening = existing.find((s) => s.stageType === 'SCREENING');
      const offer = existing.find((s) => s.stageType === 'OFFER');

      // Delete only the configurable (non-anchor) stages before re-creating them.
      await tx.hiringStage.deleteMany({
        where: { jobId, stageType: { notIn: ['SCREENING', 'OFFER'] } },
      });

      if (!screening) {
        await tx.hiringStage.create({
          data: { jobId, name: 'Screening', sequence: 1, stageType: 'SCREENING' },
        });
      }

      // Temporarily move the Offer stage sequence to a high number to avoid unique constraint violations
      // during the creation of new stages.
      if (offer) {
        await tx.hiringStage.update({
          where: { id: offer.id },
          data: { sequence: 9999 },
        });
      }

      let seq = 2;
      for (const stage of input.stages) {
        await tx.hiringStage.create({
          data: {
            jobId,
            name: stage.name,
            sequence: seq++,
            stageType: stage.stageType,
            automationLink: stage.stageType === 'INTERVIEW' && !stage.automationLink
              ? 'https://bivio.example/scheduled-meetings'
              : (stage.automationLink || null),
            emailSubject: stage.emailSubject,
            emailBodyTemplate: stage.emailBodyTemplate,
            prerequisite: stage.prerequisite,
            requirementDocUrl: stage.requirementDocUrl,
            requirementDocFileName: stage.requirementDocFileName,
          },
        });
      }

      if (!offer) {
        await tx.hiringStage.create({
          data: { jobId, name: 'Offer', sequence: seq, stageType: 'OFFER', isTerminal: true },
        });
      } else {
        await tx.hiringStage.update({ where: { id: offer.id }, data: { sequence: seq } });
      }

      return tx.hiringStage.findMany({ where: { jobId }, orderBy: { sequence: 'asc' } });
    });
  },

  upsertWeightage(jobId: string, input: SetWeightageInput) {
    return prisma.aIWeightage.upsert({
      where: { jobId },
      create: { jobId, ...input },
      update: { ...input },
    });
  },

  hasAnyApplicationsOrProposals(jobId: string) {
    return Promise.all([
      prisma.application.count({ where: { jobId } }),
      prisma.proposal.count({ where: { jobId } }),
    ]).then(([apps, props]) => apps > 0 || props > 0);
  },

  hasAnyContract(jobId: string) {
    return prisma.contract.count({ where: { jobId } }).then((n) => n > 0);
  },

  rejectAllInProgressApplications(jobId: string, reason: string) {
    return prisma.application.updateMany({
      where: { jobId, status: { in: ['APPLIED', 'IN_PROGRESS', 'OFFERED'] } },
      data: { status: 'REJECTED', rejectionReason: reason },
    });
    // NOTE: updateMany still can't write a per-application StageMovement audit
    // row (each would need its own fromStageId/toStageId) — if a full
    // per-application audit trail on cancellation is required later, loop
    // individually instead of updateMany.
    // loop individually if per-application audit trail is required here.
  },
};
