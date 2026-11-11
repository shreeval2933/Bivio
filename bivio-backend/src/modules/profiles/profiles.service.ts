import { prisma } from '../../shared/prisma';
import { profilesRepository } from './profiles.repository';
import { paymentGateway } from '../../shared/paymentGateway';
import { assertTransition, KYC_TRANSITIONS } from '../../shared/stateMachines';
import { ConflictError, ForbiddenError, NotFoundError } from '../../shared/errors';
import type {
  UpdateCandidateProfileInput, UploadResumeInput, SaveSkillsInput, SaveWorkExperienceInput,
  SaveEducationInput, SaveCertificationsInput, SaveLanguagesInput, SavePortfolioInput,
  PortfolioProjectInput, PortfolioServiceInput, UpdateRecruiterProfileInput, UpdateCompanyInput,
  VerifyPaymentMethodInput, SubmitKycInput,
} from './profiles.schema';

async function getCandidateOrThrow(userId: string) {
  const candidate = await profilesRepository.findCandidateByUserId(userId);
  if (!candidate) throw new NotFoundError('Candidate profile');
  return candidate;
}

async function getRecruiterOrThrow(userId: string) {
  const recruiter = await profilesRepository.findRecruiterByUserId(userId);
  if (!recruiter) throw new NotFoundError('Recruiter profile');
  return recruiter;
}

export const profilesService = {
  // ── Candidate profile ──────────────────────────────────────────────────
  getCandidateProfile(userId: string) {
    return getCandidateOrThrow(userId);
  },

  async updateCandidateProfile(userId: string, input: UpdateCandidateProfileInput) {
    const candidate = await getCandidateOrThrow(userId);
    const { fullName, phone, profileImage, ...profileData } = input as any;

    await prisma.$transaction(async (tx) => {
      if (fullName !== undefined || phone !== undefined || profileImage !== undefined) {
        await tx.user.update({
          where: { id: userId },
          data: {
            fullName: fullName || undefined,
            phone: phone || null,
            profileImage: profileImage || null,
          },
        });
      }
      await tx.candidateProfile.update({
        where: { id: candidate.id },
        data: profileData,
      });
    });

    return getCandidateOrThrow(userId);
  },

  // ── Resumes ─────────────────────────────────────────────────────────────
  async uploadResume(userId: string, input: UploadResumeInput) {
    const candidate = await getCandidateOrThrow(userId);
    return profilesRepository.createResume(candidate.id, input);
  },

  async setPrimaryResume(userId: string, resumeId: string) {
    const candidate = await getCandidateOrThrow(userId);
    const resume = await profilesRepository.findResumeById(resumeId);
    if (!resume) throw new NotFoundError('Resume');
    if (resume.candidateId !== candidate.id) throw new ForbiddenError();
    await profilesRepository.setPrimaryResume(candidate.id, resumeId);
    return { ok: true };
  },

  // ── Structured profile sections — replace-whole-list pattern ────────────
  async saveSkills(userId: string, input: SaveSkillsInput) {
    const candidate = await getCandidateOrThrow(userId);
    await profilesRepository.replaceSkills(candidate.id, input.skills);
    return getCandidateOrThrow(userId);
  },

  async saveWorkExperience(userId: string, input: SaveWorkExperienceInput) {
    const candidate = await getCandidateOrThrow(userId);
    const entries = input.entries.map((e) => ({
      ...e, startDate: new Date(e.startDate), endDate: e.endDate ? new Date(e.endDate) : undefined,
    }));
    await profilesRepository.replaceWorkExperience(candidate.id, entries as never);
    return getCandidateOrThrow(userId);
  },

  async saveEducation(userId: string, input: SaveEducationInput) {
    const candidate = await getCandidateOrThrow(userId);
    await profilesRepository.replaceEducation(candidate.id, input.entries);
    return getCandidateOrThrow(userId);
  },

  async saveCertifications(userId: string, input: SaveCertificationsInput) {
    const candidate = await getCandidateOrThrow(userId);
    const entries = input.entries.map((e) => ({
      ...e, issueDate: new Date(e.issueDate), expiryDate: e.expiryDate ? new Date(e.expiryDate) : undefined,
    }));
    await profilesRepository.replaceCertifications(candidate.id, entries);
    return getCandidateOrThrow(userId);
  },

  async saveLanguages(userId: string, input: SaveLanguagesInput) {
    const candidate = await getCandidateOrThrow(userId);
    // Guard the same rule the DB's @@unique([candidateId, language]) enforces,
    // so a duplicate language in one payload fails with a clean 409 instead
    // of a raw constraint-violation 500.
    const langs = input.entries.map((e) => e.language.toLowerCase());
    if (new Set(langs).size !== langs.length) {
      throw new ConflictError('Each language can only be listed once');
    }
    await profilesRepository.replaceLanguages(candidate.id, input.entries);
    return getCandidateOrThrow(userId);
  },

  // ── Freelance portfolio ─────────────────────────────────────────────────
  async getPortfolio(userId: string) {
    const candidate = await getCandidateOrThrow(userId);
    return profilesRepository.findPortfolioByCandidateId(candidate.id);
  },

  async savePortfolio(userId: string, input: SavePortfolioInput) {
    const candidate = await getCandidateOrThrow(userId);
    const data = { ...input, availableFrom: input.availableFrom ? new Date(input.availableFrom) : undefined };
    return profilesRepository.upsertPortfolio(candidate.id, data);
  },

  async addProject(userId: string, input: PortfolioProjectInput) {
    const candidate = await getCandidateOrThrow(userId);
    const portfolio = await profilesRepository.ensurePortfolio(candidate.id);
    const data = {
      ...input,
      startedOn: input.startedOn ? new Date(input.startedOn) : undefined,
      completedOn: input.completedOn ? new Date(input.completedOn) : undefined,
    };
    return profilesRepository.createProject(portfolio.id, data);
  },

  async updateProject(userId: string, projectId: string, input: Partial<PortfolioProjectInput>) {
    const candidate = await getCandidateOrThrow(userId);
    const project = await profilesRepository.findProjectById(projectId);
    if (!project) throw new NotFoundError('Portfolio project');
    if (project.portfolio.candidateId !== candidate.id) throw new ForbiddenError();

    const data = {
      ...input,
      startedOn: input.startedOn ? new Date(input.startedOn) : undefined,
      completedOn: input.completedOn ? new Date(input.completedOn) : undefined,
    };
    return profilesRepository.updateProject(projectId, data);
  },

  async deleteProject(userId: string, projectId: string) {
    const candidate = await getCandidateOrThrow(userId);
    const project = await profilesRepository.findProjectById(projectId);
    if (!project) throw new NotFoundError('Portfolio project');
    if (project.portfolio.candidateId !== candidate.id) throw new ForbiddenError();
    await profilesRepository.deleteProject(projectId);
    return { ok: true };
  },

  async addService(userId: string, input: PortfolioServiceInput) {
    const candidate = await getCandidateOrThrow(userId);
    const portfolio = await profilesRepository.ensurePortfolio(candidate.id);
    return profilesRepository.createService(portfolio.id, input);
  },

  async updateService(userId: string, serviceId: string, input: Partial<PortfolioServiceInput>) {
    const candidate = await getCandidateOrThrow(userId);
    const service = await profilesRepository.findServiceById(serviceId);
    if (!service) throw new NotFoundError('Freelance service');
    if (service.portfolio.candidateId !== candidate.id) throw new ForbiddenError();
    return profilesRepository.updateService(serviceId, input);
  },

  async deleteService(userId: string, serviceId: string) {
    const candidate = await getCandidateOrThrow(userId);
    const service = await profilesRepository.findServiceById(serviceId);
    if (!service) throw new NotFoundError('Freelance service');
    if (service.portfolio.candidateId !== candidate.id) throw new ForbiddenError();
    await profilesRepository.deleteService(serviceId);
    return { ok: true };
  },

  async getPortfolioReviews(userId: string) {
    await getCandidateOrThrow(userId);
    return profilesRepository.findReviewsByRevieweeId(userId);
  },

  // ── Recruiter profile & company ─────────────────────────────────────────
  getRecruiterProfile(userId: string) {
    return getRecruiterOrThrow(userId);
  },

  async getRecruiterTeam(userId: string) {
    const recruiter = await getRecruiterOrThrow(userId);
    if (!recruiter.companyId) {
      return [recruiter];
    }
    return prisma.recruiterProfile.findMany({
      where: { companyId: recruiter.companyId },
      include: { user: true },
    });
  },

  async updateRecruiterProfile(userId: string, input: UpdateRecruiterProfileInput) {
    const recruiter = await getRecruiterOrThrow(userId);
    return profilesRepository.updateRecruiterFields(recruiter.id, userId, input);
  },

  async updateCompany(userId: string, input: UpdateCompanyInput) {
    const recruiter = await getRecruiterOrThrow(userId);
    return profilesRepository.upsertCompany(recruiter.id, input);
  },

  // ── Verification (recruiter side) ───────────────────────────────────────
  async verifyPaymentMethod(userId: string, input: VerifyPaymentMethodInput) {
    const recruiter = await getRecruiterOrThrow(userId);
    if (recruiter.paymentMethodVerified) {
      return { paymentMethodVerified: true, alreadyVerified: true };
    }

    // Mock: a real integration charges a small authorization (e.g. ₹1),
    // confirms it succeeded, then immediately releases it — the token here
    // stands in for whatever a hosted payment field would have returned.
    // See src/shared/paymentGateway.ts for what changes when that lands.
    const orderResult = await paymentGateway.createOrder({
      amount: 1,
      currency: 'USD',
      purpose: 'PAYMENT_METHOD_VERIFICATION',
      referenceId: recruiter.id,
      email: input.email || undefined,
      cardHolder: input.cardHolder || undefined,
    });
    void input.paymentMethodToken;

    if (orderResult.checkoutUrl) {
      return { paymentMethodVerified: false, checkoutUrl: orderResult.checkoutUrl };
    }

    await profilesRepository.markPaymentMethodVerified(recruiter.id);
    return { paymentMethodVerified: true, alreadyVerified: false };
  },

  async verifyCheckoutSession(userId: string, sessionId: string) {
    const recruiter = await getRecruiterOrThrow(userId);
    if (recruiter.paymentMethodVerified) {
      return { paymentMethodVerified: true, alreadyVerified: true };
    }

    if (sessionId.startsWith('mock_')) {
      await profilesRepository.markPaymentMethodVerified(recruiter.id);
      return { paymentMethodVerified: true, alreadyVerified: false };
    }

    const session = await paymentGateway.retrieveSession(sessionId);
    if (session.payment_status === 'paid') {
      await profilesRepository.markPaymentMethodVerified(recruiter.id);
      return { paymentMethodVerified: true, alreadyVerified: false };
    }

    throw new Error('Payment checkout session is not completed or unpaid');
  },

  async submitKyc(userId: string, input: SubmitKycInput) {
    const recruiter = await getRecruiterOrThrow(userId);

    assertTransition(KYC_TRANSITIONS, recruiter.kycStatus, 'PENDING', 'kyc');

    const priorRejections = await profilesRepository.countPriorRejectedKyc(recruiter.id);
    return profilesRepository.createKycSubmission(recruiter.id, userId, {
      kycType: input.kycType,
      documents: input.documents,
      isSecondSubmission: priorRejections > 0,
    });
  },

  // ── Skills lookup (shared, no role restriction) ─────────────────────────
  searchSkills(q?: string) {
    return prisma.skill.findMany({
      where: q ? { name: { contains: q, mode: 'insensitive' }, isApproved: true } : { isApproved: true },
      take: 20,
      orderBy: { name: 'asc' },
    });
  },

  async searchCandidates(query: any) {
    const setting = await prisma.platformSetting.findUnique({ where: { key: 'FEATURE_FREELANCER_SEARCH' } });
    if (setting && setting.value === 'false') {
      return [];
    }
    return profilesRepository.searchCandidates(query);
  },
};
