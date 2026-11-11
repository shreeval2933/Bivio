import { prisma } from '../../shared/prisma';
import { Prisma } from '@prisma/client';

const APPLICATION_INCLUDE = {
  job: { include: { company: true, hiringStages: { orderBy: { sequence: 'asc' as const } } } },
  candidate: { include: { user: true, skills: { include: { skill: true } }, portfolio: true } },
  currentStage: true,
  resume: true,
  movements: { include: { fromStage: true, toStage: true, movedBy: true }, orderBy: { movedAt: 'asc' as const } },
  interviews: { include: { interviewer: true } },
  offer: true,
} satisfies Prisma.ApplicationInclude;

export const hiringRepository = {
  // ── Applications ──────────────────────────────────────────────────────
  findApplicationById(id: string) {
    return prisma.application.findUnique({ where: { id }, include: APPLICATION_INCLUDE });
  },

  findApplications(where: Prisma.ApplicationWhereInput) {
    return prisma.application.findMany({
      where,
      include: APPLICATION_INCLUDE,
      orderBy: { appliedAt: 'desc' },
    });
  },

  hasLiveApplication(jobId: string, candidateId: string) {
    return prisma.application
      .count({ where: { jobId, candidateId, status: { notIn: ['WITHDRAWN', 'REJECTED'] } } })
      .then((n) => n > 0);
  },

  createApplication(data: {
    jobId: string; candidateId: string; resumeId: string | null;
    firstStageId: string; snapshotAiScore: number | null; coverNote?: string;
    source: 'DIRECT' | 'INVITED'; movedByUserId: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const application = await tx.application.create({
        data: {
          jobId: data.jobId,
          candidateId: data.candidateId,
          resumeId: data.resumeId,
          currentStageId: data.firstStageId,
          snapshotAiScore: data.snapshotAiScore,
          coverNote: data.coverNote,
          source: data.source,
          status: 'APPLIED',
        },
        include: APPLICATION_INCLUDE,
      });
      await tx.stageMovement.create({
        data: {
          applicationId: application.id,
          fromStageId: null,
          toStageId: data.firstStageId,
          movedByUserId: data.movedByUserId,
          note: 'Application submitted',
        },
      });
      return application;
    });
  },

  updateApplicationStatus(id: string, status: Prisma.ApplicationUpdateInput['status'], rejectionReason?: string) {
    return prisma.application.update({ where: { id }, data: { status, rejectionReason } });
  },

  async moveStage(applicationId: string, toStageId: string, movedByUserId: string, note?: string) {
    return prisma.$transaction(async (tx) => {
      const application = await tx.application.update({
        where: { id: applicationId },
        data: { currentStageId: toStageId },
        include: { currentStage: true },
      });
      await tx.stageMovement.create({
        data: { applicationId, toStageId, movedByUserId, note },
      });
      return application;
    });
  },

  bulkReject(applicationIds: string[]) {
    return prisma.application.updateMany({
      where: { id: { in: applicationIds } },
      data: { status: 'REJECTED' },
    });
  },

  countHiredForJob(jobId: string) {
    return prisma.application.count({ where: { jobId, status: 'HIRED' } });
  },

  // ── Invitations ───────────────────────────────────────────────────────
  findInvitationById(id: string) {
    return prisma.invitation.findUnique({
      where: { id },
      include: { job: { include: { company: true } }, candidate: { include: { user: true } } },
    });
  },

  findInvitations(where: Prisma.InvitationWhereInput) {
    return prisma.invitation.findMany({
      where,
      include: { job: { include: { company: true } } },
      orderBy: { createdAt: 'desc' },
    });
  },

  createInvitation(data: {
    jobId: string; recruiterId: string; candidateId: string; message?: string; expiresAt: Date;
  }) {
    return prisma.invitation.create({ data });
  },

  updateInvitationStatus(id: string, status: 'ACCEPTED' | 'DECLINED') {
    return prisma.invitation.update({
      where: { id },
      data: { status, respondedAt: new Date() },
    });
  },

  // ── Offers ────────────────────────────────────────────────────────────
  findOfferById(id: string) {
    return prisma.offer.findUnique({
      where: { id },
      include: { application: { include: { job: { include: { company: true } }, candidate: { include: { user: true } } } } },
    });
  },

  findOffersForCandidate(candidateId: string) {
    return prisma.offer.findMany({
      where: { application: { candidateId } },
      include: { application: { include: { job: { include: { company: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
  },

  findOffersForRecruiter(recruiterId: string) {
    return prisma.offer.findMany({
      where: { application: { job: { recruiterId } } },
      include: {
        application: {
          include: { job: true, candidate: { include: { user: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  createOffer(data: {
    applicationId: string; compensation: number; currency: string;
    joiningDate?: Date; offerLetterUrl?: string; expiresAt: Date;
  }) {
    return prisma.offer.create({ data });
  },

  updateOfferStatus(id: string, status: 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN', rejectionReason?: string) {
    return prisma.offer.update({
      where: { id },
      data: { status, respondedAt: new Date(), rejectionReason },
    });
  },

  // ── Interviews ────────────────────────────────────────────────────────
  findInterviewById(id: string) {
    return prisma.interview.findUnique({
      where: { id },
      include: { application: { include: { job: true } }, interviewer: true },
    });
  },

  findInterviews(where: Prisma.InterviewWhereInput) {
    return prisma.interview.findMany({
      where,
      include: {
        application: { include: { job: true, candidate: { include: { user: true } } } },
        interviewer: true,
      },
      orderBy: { scheduledAt: 'asc' },
    });
  },

  countRoundsForApplication(applicationId: string) {
    return prisma.interview.count({ where: { applicationId } });
  },

  createInterview(data: {
    applicationId: string; hiringStageId?: string; interviewerId: string;
    roundNo: number; scheduledAt: Date; durationMinutes: number;
    mode: 'ONLINE' | 'PHONE' | 'ONSITE'; meetingLink?: string; location?: string; agendaNotes?: string;
  }) {
    return prisma.interview.create({ data });
  },

  rescheduleInterview(id: string, scheduledAt: Date, reason?: string) {
    return prisma.interview.update({
      where: { id },
      data: { scheduledAt, rescheduleReason: reason, status: 'SCHEDULED' },
    });
  },

  submitFeedback(id: string, data: {
    commRating?: number; techRating?: number; cultureRating?: number;
    rating: number; feedback?: string; recommendation: 'PROCEED' | 'HOLD' | 'REJECT';
  }) {
    return prisma.interview.update({
      where: { id },
      data: { ...data, status: 'COMPLETED', submittedAt: new Date() },
    });
  },

  updateInterviewStatus(id: string, status: 'CANCELLED' | 'NO_SHOW' | 'SCHEDULED') {
    return prisma.interview.update({ where: { id }, data: { status } });
  },

  // ── Shared lookups ────────────────────────────────────────────────────
  findJobWithStages(jobId: string) {
    return prisma.job.findUnique({
      where: { id: jobId },
      include: { hiringStages: { orderBy: { sequence: 'asc' } } },
    });
  },

  findCurrentMatchScore(jobId: string, candidateId: string) {
    return prisma.matchScore.findFirst({ where: { jobId, candidateId, isCurrent: true } });
  },

  findPrimaryResume(candidateId: string) {
    return prisma.resume.findFirst({ where: { candidateId, isPrimary: true } });
  },
};
