import { prisma } from '../../shared/prisma';
import { hiringRepository } from './hiring.repository';
import {
  assertTransition, APPLICATION_TRANSITIONS, INVITE_TRANSITIONS,
  OFFER_TRANSITIONS, INTERVIEW_TRANSITIONS,
} from '../../shared/stateMachines';
import {
  ConflictError, ForbiddenError, NotFoundError, ValidationError,
} from '../../shared/errors';
import { events } from '../../shared/events';
import { sendMail, renderTemplate } from '../../shared/mailer';
import type {
  ApplyToJobInput, MoveStageInput, BulkStageInput, BulkRejectInput, RejectApplicationInput,
  SendInvitationInput, RespondInvitationInput, ExtendOfferInput, RespondOfferInput,
  ScheduleInterviewInput, RescheduleInterviewInput, InterviewFeedbackInput,
} from './hiring.schema';

async function getCandidateOrThrow(userId: string) {
  const candidate = await prisma.candidateProfile.findUnique({ where: { userId } });
  if (!candidate) throw new NotFoundError('Candidate profile');
  return candidate;
}

async function getRecruiterOrThrow(userId: string) {
  const recruiter = await prisma.recruiterProfile.findUnique({ where: { userId } });
  if (!recruiter) throw new NotFoundError('Recruiter profile');
  return recruiter;
}

async function getSettingNumber(key: string, fallback: number): Promise<number> {
  const setting = await prisma.platformSetting.findUnique({ where: { key } });
  const n = Number(setting?.value);
  return Number.isFinite(n) ? n : fallback;
}

/** Fires the stage-entry automation email for OA/Interview stage types. Never
 * blocks the calling transition — a failed email send shouldn't roll back a
 * successful stage move. */
async function fireStageAutomation(applicationId: string, toStageId: string) {
  console.log(`[fireStageAutomation] Triggered for application: ${applicationId}, stage: ${toStageId}`);
  const stage = await prisma.hiringStage.findUnique({ where: { id: toStageId } });
  if (!stage) {
    console.log(`[fireStageAutomation] Error: Stage not found for id: ${toStageId}`);
    return;
  }
  console.log(`[fireStageAutomation] Loaded stage info: ${stage.name} (${stage.stageType})`);

  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { candidate: { include: { user: true } }, job: { include: { company: true } } },
  });
  if (!app) {
    console.log(`[fireStageAutomation] Error: Application not found for id: ${applicationId}`);
    return;
  }
  console.log(`[fireStageAutomation] Target candidate email: ${app.candidate.user.email}`);

  let emailSubject = stage.emailSubject;
  let emailBodyTemplate = stage.emailBodyTemplate;

  const candidateName = app.candidate.user.fullName;
  const jobTitle = app.job.title;
  const companyName = app.job.company?.name ?? 'Nexus Talent';

  if (!emailSubject || !emailBodyTemplate) {
    if (stage.stageType === 'SCREENING') {
      console.log(`[fireStageAutomation] No template configured. Injecting default SCREENING template.`);
      emailSubject = `Application Reviewing: {{jobTitle}} at {{companyName}}`;
      emailBodyTemplate = `Hi {{candidateName}},\n\nYour application for the {{jobTitle}} position is now in the Screening stage at {{companyName}}. Our team is reviewing your profile and credentials. We will contact you soon if we wish to proceed with next steps.\n\nBest regards,\n{{companyName}} Hiring Team`;
    } else if (stage.stageType === 'OFFER') {
      console.log(`[fireStageAutomation] No template configured. Injecting default OFFER template.`);
      emailSubject = `Offer Preparation: {{jobTitle}} at {{companyName}}`;
      emailBodyTemplate = `Hi {{candidateName}},\n\nCongratulations! You have successfully reached the Offer stage for the {{jobTitle}} position at {{companyName}}. Our team is currently preparing your offer package details and will send your official offer letter very soon.\n\nBest regards,\n{{companyName}} Hiring Team`;
    } else {
      console.log(`[fireStageAutomation] No template configured for stage type: ${stage.stageType}. Skipping email.`);
      return;
    }
  }

  const vars = {
    candidateName,
    jobTitle,
    companyName,
    link: stage.automationLink ?? null,
  };

  try {
    console.log(`[fireStageAutomation] Dispatching email to: ${app.candidate.user.email}`);
    await sendMail({
      to: app.candidate.user.email,
      subject: renderTemplate(emailSubject, vars),
      body: renderTemplate(emailBodyTemplate, vars),
    });
    console.log(`[fireStageAutomation] Email successfully sent/logged!`);
  } catch (err) {
    console.error(`[fireStageAutomation] Nodemailer error occurred:`, err);
  }
}

export const hiringService = {
  // ══════════════════════════════════ APPLICATIONS ══════════════════════

  async listApplications(userId: string, role: string, filters: { jobId?: string; mine?: boolean }) {
    const where: Record<string, unknown> = {};
    if (filters.jobId) where.jobId = filters.jobId;
    if (filters.mine || role === 'CANDIDATE') {
      const candidate = await getCandidateOrThrow(userId);
      where.candidateId = candidate.id;
    }
    return hiringRepository.findApplications(where as never);
  },

  async getApplicationDetail(userId: string, role: string, applicationId: string) {
    const application = await hiringRepository.findApplicationById(applicationId);
    if (!application) throw new NotFoundError('Application');

    if (role === 'CANDIDATE') {
      const candidate = await getCandidateOrThrow(userId);
      if (application.candidateId !== candidate.id) throw new ForbiddenError();
    } else if (role === 'RECRUITER') {
      const recruiter = await getRecruiterOrThrow(userId);
      if (application.job.recruiterId !== recruiter.id) throw new ForbiddenError();
    }
    return application;
  },

  async apply(userId: string, jobId: string, input: ApplyToJobInput) {
    const candidate = await getCandidateOrThrow(userId);

    if (!candidate.fullTimeFeePaid) {
      throw new ConflictError('Pay the one-time full-time application fee before applying');
    }

    const job = await hiringRepository.findJobWithStages(jobId);
    if (!job) throw new NotFoundError('Job');
    if (job.status !== 'OPEN') throw new ConflictError('This job is not accepting applications');
    if (job.jobType !== 'FULL_TIME') throw new ValidationError('Only full-time jobs accept applications');

    // Belt-and-suspenders: the partial unique index is the real guard against
    // races here; this check just gives a clean error in the common case.
    const hasLive = await hiringRepository.hasLiveApplication(jobId, candidate.id);
    if (hasLive) throw new ConflictError('You already have an active application for this job');

    const firstStage = job.hiringStages.find((s) => s.stageType === 'SCREENING');
    if (!firstStage) throw new ConflictError('This job has no screening stage configured');

    const resumeId = input.resumeId ?? (await hiringRepository.findPrimaryResume(candidate.id))?.id ?? null;

    // Snapshot the AI score at the moment of application — frozen forever,
    // never recomputed even if the candidate later edits their profile.
    const matchScore = await hiringRepository.findCurrentMatchScore(jobId, candidate.id);

    const application = await hiringRepository.createApplication({
      jobId,
      candidateId: candidate.id,
      resumeId,
      firstStageId: firstStage.id,
      snapshotAiScore: matchScore ? Number(matchScore.score) : null,
      coverNote: input.coverNote,
      source: 'DIRECT',
      movedByUserId: userId,
    });

    return application;
  },

  async withdraw(userId: string, applicationId: string) {
    const candidate = await getCandidateOrThrow(userId);
    const application = await hiringRepository.findApplicationById(applicationId);
    if (!application) throw new NotFoundError('Application');
    if (application.candidateId !== candidate.id) throw new ForbiddenError();

    assertTransition(APPLICATION_TRANSITIONS, application.status, 'WITHDRAWN', 'application');
    return hiringRepository.updateApplicationStatus(applicationId, 'WITHDRAWN');
  },

  async moveStage(userId: string, applicationId: string, input: MoveStageInput) {
    const recruiter = await getRecruiterOrThrow(userId);
    const application = await hiringRepository.findApplicationById(applicationId);
    if (!application) throw new NotFoundError('Application');
    if (application.job.recruiterId !== recruiter.id) throw new ForbiddenError();

    // Advancing off APPLIED is the one status change a stage-move can cause;
    // every subsequent move within IN_PROGRESS is a self-loop (any stage to
    // any stage), per APPLICATION_TRANSITIONS.
    if (application.status === 'APPLIED') {
      assertTransition(APPLICATION_TRANSITIONS, 'APPLIED', 'IN_PROGRESS', 'application');
      await hiringRepository.updateApplicationStatus(applicationId, 'IN_PROGRESS');
    } else if (!APPLICATION_TRANSITIONS[application.status].includes('IN_PROGRESS') && application.status !== 'IN_PROGRESS') {
      throw new ConflictError(`Cannot move an application in status ${application.status}`);
    }

    const updated = await hiringRepository.moveStage(applicationId, input.toStageId, userId, input.note);

    events.emit('ApplicationStageChanged', {
      applicationId, toStageId: input.toStageId, stageType: updated.currentStage?.stageType ?? 'CUSTOM',
    });
    await fireStageAutomation(applicationId, input.toStageId);

    return updated;
  },

  async bulkMoveStage(userId: string, input: BulkStageInput) {
    const recruiter = await getRecruiterOrThrow(userId);
    const results = [];
    for (const applicationId of input.applicationIds) {
      const application = await hiringRepository.findApplicationById(applicationId);
      if (!application || application.job.recruiterId !== recruiter.id) continue; // silently skip ones not owned
      results.push(await this.moveStage(userId, applicationId, { toStageId: input.toStageId }));
    }
    return results;
  },

  async bulkReject(userId: string, input: BulkRejectInput) {
    const recruiter = await getRecruiterOrThrow(userId);
    const owned: string[] = [];
    for (const id of input.applicationIds) {
      const application = await hiringRepository.findApplicationById(id);
      if (application && application.job.recruiterId === recruiter.id) owned.push(id);
    }
    return hiringRepository.bulkReject(owned);
  },

  async reject(userId: string, applicationId: string, input: RejectApplicationInput) {
    const recruiter = await getRecruiterOrThrow(userId);
    const application = await hiringRepository.findApplicationById(applicationId);
    if (!application) throw new NotFoundError('Application');
    if (application.job.recruiterId !== recruiter.id) throw new ForbiddenError();

    assertTransition(APPLICATION_TRANSITIONS, application.status, 'REJECTED', 'application');
    const reasonText = [input.reason, input.note].filter(Boolean).join(' — ') || undefined;
    return hiringRepository.updateApplicationStatus(applicationId, 'REJECTED', reasonText);
  },

  // ══════════════════════════════════ INVITATIONS ═══════════════════════

  async listInvitations(userId: string, role: string) {
    if (role === 'CANDIDATE') {
      const candidate = await getCandidateOrThrow(userId);
      return hiringRepository.findInvitations({ candidateId: candidate.id });
    }
    const recruiter = await getRecruiterOrThrow(userId);
    return hiringRepository.findInvitations({ recruiterId: recruiter.id });
  },

  async sendInvitation(userId: string, jobId: string, input: SendInvitationInput) {
    const recruiter = await getRecruiterOrThrow(userId);
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundError('Job');
    if (job.recruiterId !== recruiter.id) throw new ForbiddenError();
    if (job.status !== 'OPEN') throw new ConflictError('Job must be open to send invitations');

    // Prevent duplicate active invitations
    const existingActive = await prisma.invitation.findFirst({
      where: {
        jobId,
        candidateId: input.candidateId,
        status: 'SENT',
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      }
    });
    if (existingActive) {
      throw new ConflictError('An active pending invitation has already been sent to this candidate');
    }

    const expiryDays = await getSettingNumber('INVITATION_EXPIRY_DAYS', 7);
    const expiresAt = input.expiresAt
      ? new Date(input.expiresAt)
      : new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

    const invitation = await hiringRepository.createInvitation({
      jobId, recruiterId: recruiter.id, candidateId: input.candidateId,
      message: input.message, expiresAt,
    });

    events.emit('InvitationSent', { invitationId: invitation.id, candidateId: input.candidateId });
    return invitation;
  },

  async respondInvitation(userId: string, invitationId: string, input: RespondInvitationInput) {
    const candidate = await getCandidateOrThrow(userId);
    const invitation = await hiringRepository.findInvitationById(invitationId);
    if (!invitation) throw new NotFoundError('Invitation');
    if (invitation.candidateId !== candidate.id) throw new ForbiddenError();

    if (!input.accept) {
      assertTransition(INVITE_TRANSITIONS, invitation.status, 'DECLINED', 'invitation');
      return hiringRepository.updateInvitationStatus(invitationId, 'DECLINED');
    }

    assertTransition(INVITE_TRANSITIONS, invitation.status, 'ACCEPTED', 'invitation');
    const updated = await hiringRepository.updateInvitationStatus(invitationId, 'ACCEPTED');

    // Full-time: acceptance creates the application directly, source=INVITED.
    // Freelance: acceptance does NOT auto-create a proposal — it's an on-ramp
    // to bidding, per the no-negotiation design; the freelancer still submits
    // a real bid through the freelance module.
    if (invitation.job.jobType === 'FULL_TIME') {
      const job = await hiringRepository.findJobWithStages(invitation.jobId);
      const firstStage = job?.hiringStages.find((s) => s.stageType === 'SCREENING');
      if (!job || !firstStage) throw new ConflictError('Job is not properly configured');

      const matchScore = await hiringRepository.findCurrentMatchScore(invitation.jobId, candidate.id);
      const resumeId = (await hiringRepository.findPrimaryResume(candidate.id))?.id ?? null;

      await hiringRepository.createApplication({
        jobId: invitation.jobId,
        candidateId: candidate.id,
        resumeId,
        firstStageId: firstStage.id,
        snapshotAiScore: matchScore ? Number(matchScore.score) : null,
        source: 'INVITED',
        movedByUserId: userId,
      });
    }

    return updated;
  },

  // ══════════════════════════════════ OFFERS ════════════════════════════

  async listOffers(userId: string, role: string) {
    if (role === 'CANDIDATE') {
      const candidate = await getCandidateOrThrow(userId);
      return hiringRepository.findOffersForCandidate(candidate.id);
    }
    const recruiter = await getRecruiterOrThrow(userId);
    return hiringRepository.findOffersForRecruiter(recruiter.id);
  },

  async extendOffer(userId: string, applicationId: string, input: ExtendOfferInput) {
    const recruiter = await getRecruiterOrThrow(userId);
    const application = await hiringRepository.findApplicationById(applicationId);
    if (!application) throw new NotFoundError('Application');
    if (application.job.recruiterId !== recruiter.id) throw new ForbiddenError();

    if (application.currentStage?.stageType !== 'OFFER') {
      throw new ConflictError('Application must be on the Offer stage before extending an offer');
    }

    const expiryDays = await getSettingNumber('OFFER_EXPIRY_DAYS', 7);
    const expiresAt = input.expiresAt
      ? new Date(input.expiresAt)
      : new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

    const offer = await hiringRepository.createOffer({
      applicationId,
      compensation: input.compensation,
      currency: input.currency,
      joiningDate: input.joiningDate ? new Date(input.joiningDate) : undefined,
      offerLetterUrl: input.offerLetterUrl,
      expiresAt,
    });

    assertTransition(APPLICATION_TRANSITIONS, application.status, 'OFFERED', 'application');
    await hiringRepository.updateApplicationStatus(applicationId, 'OFFERED');

    // Trigger offer letter email notification
    const candidateEmail = application.candidate.user.email;
    const candidateName = application.candidate.user.fullName;
    const jobTitle = application.job.title;
    const companyName = application.job.company?.name || 'Nexus Talent';
    const amountStr = `${input.currency || 'USD'} ${input.compensation.toLocaleString()}`;
    const joinDateStr = input.joiningDate ? new Date(input.joiningDate).toLocaleDateString() : 'To be discussed';
    
    sendMail({
      to: candidateEmail,
      subject: `Official Job Offer: ${jobTitle} at ${companyName}`,
      body: `Hi ${candidateName},\n\nCongratulations! We are thrilled to extend an official job offer for the position of ${jobTitle} at ${companyName}.\n\nOffer Details:\n- Compensation: ${amountStr}\n- Target Joining Date: ${joinDateStr}\n- Expiration Date: ${expiresAt.toLocaleDateString()}\n\nPlease log in to your candidate dashboard to view the full details and respond to this offer.\n\nBest regards,\n${companyName} Hiring Team`,
    }).then(() => {
      console.log(`[extendOffer] Offer letter email successfully sent to: ${candidateEmail}`);
    }).catch((err) => {
      console.error('FAILED TO SEND OFFER EMAIL:', err);
    });

    events.emit('OfferExtended', { offerId: offer.id, applicationId });
    return offer;
  },

  async respondOffer(userId: string, offerId: string, input: RespondOfferInput) {
    const candidate = await getCandidateOrThrow(userId);
    const offer = await hiringRepository.findOfferById(offerId);
    if (!offer) throw new NotFoundError('Offer');
    if (offer.application.candidateId !== candidate.id) throw new ForbiddenError();

    if (!input.accept) {
      assertTransition(OFFER_TRANSITIONS, offer.status, 'REJECTED', 'offer');
      await hiringRepository.updateOfferStatus(offerId, 'REJECTED', input.rejectionReason);
      assertTransition(APPLICATION_TRANSITIONS, offer.application.status, 'REJECTED', 'application');
      await hiringRepository.updateApplicationStatus(offer.applicationId, 'REJECTED');
      return { ok: true, status: 'REJECTED' as const };
    }

    assertTransition(OFFER_TRANSITIONS, offer.status, 'ACCEPTED', 'offer');
    await hiringRepository.updateOfferStatus(offerId, 'ACCEPTED');
    assertTransition(APPLICATION_TRANSITIONS, offer.application.status, 'HIRED', 'application');
    await hiringRepository.updateApplicationStatus(offer.applicationId, 'HIRED');

    // Auto-close the job if this hire fills the last vacancy.
    const job = await prisma.job.findUnique({ where: { id: offer.application.jobId } });
    if (job) {
      const hiredCount = await hiringRepository.countHiredForJob(job.id);
      if (hiredCount >= job.vacancies) {
        await prisma.job.update({ where: { id: job.id }, data: { status: 'CLOSED' } });
      }
      await prisma.recruiterProfile.update({
        where: { id: job.recruiterId }, data: { hiresCount: { increment: 1 } },
      });
    }

    // NOTE: contact-info gating (hiding candidate email/phone from recruiters
    // until this point) is a serialization-layer concern, not a schema/state
    // one — implement it in the controller's response shaping for
    // GET /applications/:id once that's prioritized, not here.
    return { ok: true, status: 'HIRED' as const };
  },

  async withdrawOffer(userId: string, offerId: string) {
    const recruiter = await getRecruiterOrThrow(userId);
    const offer = await hiringRepository.findOfferById(offerId);
    if (!offer) throw new NotFoundError('Offer');
    if (offer.application.job.recruiterId !== recruiter.id) throw new ForbiddenError();

    assertTransition(OFFER_TRANSITIONS, offer.status, 'WITHDRAWN', 'offer');
    return hiringRepository.updateOfferStatus(offerId, 'WITHDRAWN');
  },

  // ══════════════════════════════════ INTERVIEWS ════════════════════════

  async listInterviews(userId: string, role: string, view?: 'upcoming' | 'needs-feedback' | 'past') {
    const where: Record<string, any> = {};
    if (role === 'CANDIDATE') {
      const candidate = await getCandidateOrThrow(userId);
      where.application = { candidateId: candidate.id };
    } else if (role === 'RECRUITER') {
      where.interviewerId = userId;
    }

    if (view === 'upcoming') {
      Object.assign(where, { status: { in: ['SCHEDULED', 'RESCHEDULED'] } });
    } else if (view === 'needs-feedback') {
      Object.assign(where, { status: 'COMPLETED', recommendation: null });
    } else if (view === 'past') {
      Object.assign(where, { status: { in: ['COMPLETED', 'CANCELLED', 'NO_SHOW'] } });
    }

    return hiringRepository.findInterviews(where as any);
  },

  async listCompanyInterviews(userId: string) {
    const recruiter = await getRecruiterOrThrow(userId);
    return hiringRepository.findInterviews({
      application: { job: { recruiterId: recruiter.id } }
    });
  },

  async listCalendarInterviews(userId: string, role: string, startDate: string, endDate: string) {
    const where: Record<string, any> = {
      scheduledAt: {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    };

    if (role === 'CANDIDATE') {
      const candidate = await getCandidateOrThrow(userId);
      where.application = { candidateId: candidate.id };
    } else if (role === 'RECRUITER') {
      const recruiter = await getRecruiterOrThrow(userId);
      where.application = { job: { recruiterId: recruiter.id } };
    }

    return hiringRepository.findInterviews(where as any);
  },

  async candidateRespond(userId: string, interviewId: string, input: any) {
    const candidate = await getCandidateOrThrow(userId);
    const interview = await hiringRepository.findInterviewById(interviewId);
    if (!interview) throw new NotFoundError('Interview');
    if (interview.application.candidateId !== candidate.id) throw new ForbiddenError();

    if (input.status === 'DECLINED') {
      return prisma.interview.update({
        where: { id: interviewId },
        // @ts-ignore
        data: {
          status: 'CANCELLED',
          candidateResponse: 'DECLINED',
          rescheduleReason: input.rescheduleReason || 'Declined by candidate'
        }
      });
    } else {
      return prisma.interview.update({
        where: { id: interviewId },
        // @ts-ignore
        data: {
          status: 'SCHEDULED',
          candidateResponse: 'ACCEPTED'
        }
      });
    }
  },

  async getInterviewDetail(userId: string, role: string, interviewId: string) {
    const interview = await hiringRepository.findInterviewById(interviewId);
    if (!interview) throw new NotFoundError('Interview');

    if (role === 'CANDIDATE') {
      const candidate = await getCandidateOrThrow(userId);
      if (interview.application.candidateId !== candidate.id) throw new ForbiddenError();
    } else if (role === 'RECRUITER') {
      const recruiter = await getRecruiterOrThrow(userId);
      if (interview.application.job.recruiterId !== recruiter.id) throw new ForbiddenError();
    }

    return interview;
  },


  async schedule(userId: string, applicationId: string, input: ScheduleInterviewInput) {
    const recruiter = await getRecruiterOrThrow(userId);
    const application = await hiringRepository.findApplicationById(applicationId);
    if (!application) throw new NotFoundError('Application');
    if (application.job.recruiterId !== recruiter.id) throw new ForbiddenError();

    const roundNo = (await hiringRepository.countRoundsForApplication(applicationId)) + 1;

    const interview = await hiringRepository.createInterview({
      applicationId,
      hiringStageId: input.hiringStageId,
      interviewerId: input.interviewerId,
      roundNo,
      scheduledAt: new Date(input.scheduledAt),
      durationMinutes: input.durationMinutes,
      mode: input.mode,
      meetingLink: input.meetingLink,
      location: input.location,
      agendaNotes: input.agendaNotes,
    });

    sendInterviewEmail(interview.id, 'SCHEDULED').catch(() => {});
    return interview;
  },

  async reschedule(userId: string, interviewId: string, input: RescheduleInterviewInput) {
    const recruiter = await getRecruiterOrThrow(userId);
    const interview = await hiringRepository.findInterviewById(interviewId);
    if (!interview) throw new NotFoundError('Interview');
    if (interview.application.job.recruiterId !== recruiter.id) throw new ForbiddenError();

    assertTransition(INTERVIEW_TRANSITIONS, interview.status, 'RESCHEDULED', 'interview');
    // The UI collects the new slot in the same action as the reschedule
    // request, so we go straight from RESCHEDULED back to SCHEDULED with the
    // new date rather than requiring a second call.
    assertTransition(INTERVIEW_TRANSITIONS, 'RESCHEDULED', 'SCHEDULED', 'interview');
    const updated = await hiringRepository.rescheduleInterview(interviewId, new Date(input.scheduledAt), input.rescheduleReason);
    sendInterviewEmail(updated.id, 'RESCHEDULED').catch(() => {});
    return updated;
  },

  async submitFeedback(userId: string, interviewId: string, input: InterviewFeedbackInput) {
    const recruiter = await getRecruiterOrThrow(userId);
    const interview = await hiringRepository.findInterviewById(interviewId);
    if (!interview) throw new NotFoundError('Interview');
    if (interview.application.job.recruiterId !== recruiter.id) throw new ForbiddenError();

    assertTransition(INTERVIEW_TRANSITIONS, interview.status, 'COMPLETED', 'interview');
    return hiringRepository.submitFeedback(interviewId, input);
  },

  async cancel(userId: string, interviewId: string) {
    const recruiter = await getRecruiterOrThrow(userId);
    const interview = await hiringRepository.findInterviewById(interviewId);
    if (!interview) throw new NotFoundError('Interview');
    if (interview.application.job.recruiterId !== recruiter.id) throw new ForbiddenError();

    assertTransition(INTERVIEW_TRANSITIONS, interview.status, 'CANCELLED', 'interview');
    const updated = await hiringRepository.updateInterviewStatus(interviewId, 'CANCELLED');
    sendInterviewEmail(updated.id, 'CANCELLED').catch(() => {});
    return updated;
  },

  async resendStageEmails(userId: string, jobId: string, stageId: string) {
    const recruiter = await getRecruiterOrThrow(userId);
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundError('Job');
    if (job.recruiterId !== recruiter.id) throw new ForbiddenError();

    const applications = await prisma.application.findMany({
      where: {
        jobId,
        currentStageId: stageId,
        status: { in: ['APPLIED', 'IN_PROGRESS'] }
      }
    });

    for (const app of applications) {
      fireStageAutomation(app.id, stageId).catch(() => {});
    }

    return { count: applications.length };
  },
};

async function sendInterviewEmail(interviewId: string, action: 'SCHEDULED' | 'RESCHEDULED' | 'CANCELLED') {
  const interview = await prisma.interview.findUnique({
    where: { id: interviewId },
    include: {
      application: { include: { candidate: { include: { user: true } }, job: { include: { company: true } } } },
      interviewer: true,
    }
  });
  if (!interview || !interview.application?.candidate?.user?.email) return;

  const app = interview.application;
  const candidateEmail = app.candidate.user.email;
  const candidateName = app.candidate.user.fullName;
  const jobTitle = app.job.title;
  const companyName = app.job.company?.name || 'Nexus Talent';
  const timeStr = new Date(interview.scheduledAt).toLocaleString();
  const duration = interview.durationMinutes;
  const linkOrLoc = interview.meetingLink || interview.location || 'Telephone Call';

  let subject = '';
  let body = '';

  if (action === 'SCHEDULED') {
    subject = `Interview Scheduled: ${jobTitle} - ${companyName}`;
    body = `Hi ${candidateName},\n\nAn interview has been scheduled for your application for the ${jobTitle} position.\n\nDate & Time: ${timeStr}\nDuration: ${duration} minutes\nMode: ${interview.mode}\nMeeting Link/Location: ${linkOrLoc}\n\nPlease review these details in your candidate dashboard and accept or decline the slot.\n\nBest,\nNexus Talent`;
  } else if (action === 'RESCHEDULED') {
    subject = `Interview Rescheduled: ${jobTitle} - ${companyName}`;
    body = `Hi ${candidateName},\n\nYour interview for the ${jobTitle} position has been rescheduled.\n\nNew Date & Time: ${timeStr}\nDuration: ${duration} minutes\nMode: ${interview.mode}\nMeeting Link/Location: ${linkOrLoc}\n\nPlease update your calendar accordingly.\n\nBest,\nNexus Talent`;
  } else if (action === 'CANCELLED') {
    subject = `Interview Cancelled: ${jobTitle} - ${companyName}`;
    body = `Hi ${candidateName},\n\nYour scheduled interview for the ${jobTitle} position has been cancelled.\n\nReason: ${interview.rescheduleReason || 'No reason provided.'}\n\nBest,\nNexus Talent`;
  }

  try {
    await sendMail({ to: candidateEmail, subject, body });
  } catch (err) {
    // swallow error so that it does not affect critical flow
  }
}
