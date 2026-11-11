import { prisma } from '../../shared/prisma';

const CANDIDATE_INCLUDE = {
  user: true,
  skills: { include: { skill: true } },
  resumes: { orderBy: { version: 'desc' as const } },
  workExperience: { orderBy: { startDate: 'desc' as const } },
  education: { orderBy: { startYear: 'desc' as const } },
  certifications: { orderBy: { issueDate: 'desc' as const } },
  languages: true,
  portfolio: { include: { projects: { include: { skills: { include: { skill: true } } }, orderBy: { displayOrder: 'asc' as const } }, services: { include: { skills: { include: { skill: true } } } } } },
};

export const profilesRepository = {
  // ── Candidate profile ──────────────────────────────────────────────────
  findCandidateByUserId(userId: string) {
    return prisma.candidateProfile.findUnique({ where: { userId }, include: CANDIDATE_INCLUDE });
  },

  updateCandidateProfile(id: string, data: Record<string, unknown>) {
    return prisma.candidateProfile.update({ where: { id }, data: data as never, include: CANDIDATE_INCLUDE });
  },

  // ── Resumes ─────────────────────────────────────────────────────────────
  async createResume(candidateId: string, data: { fileUrl: string; fileName: string; mimeType: string; sizeBytes: number }) {
    const count = await prisma.resume.count({ where: { candidateId } });
    return prisma.resume.create({
      data: { candidateId, version: count + 1, isPrimary: count === 0, ...data, sizeBytes: BigInt(data.sizeBytes) },
    });
  },

  /** Exactly one primary per candidate — enforced by a partial unique index
   * at the DB level too; this unsets the old one first so the transition is
   * always clean rather than relying solely on the constraint to reject it. */
  setPrimaryResume(candidateId: string, resumeId: string) {
    return prisma.$transaction([
      prisma.resume.updateMany({ where: { candidateId, isPrimary: true }, data: { isPrimary: false } }),
      prisma.resume.update({ where: { id: resumeId }, data: { isPrimary: true } }),
    ]);
  },

  findResumeById(id: string) {
    return prisma.resume.findUnique({ where: { id } });
  },

  // ── Skills / work experience / education / certifications / languages ──
  // All five use the same "replace the whole set" pattern — the frontend
  // saves each section as one complete list, not incremental edits.
  replaceSkills(candidateId: string, skills: Array<{ skillId: string; proficiency?: number; yearsOfExperience?: number }>) {
    return prisma.$transaction([
      prisma.candidateSkill.deleteMany({ where: { candidateId } }),
      prisma.candidateSkill.createMany({
        data: skills.map((s) => ({ candidateId, ...s })),
      }),
    ]);
  },

  replaceWorkExperience(candidateId: string, entries: Array<{
    company: string; title: string; employmentType: string; startDate: Date;
    endDate?: Date; isCurrent: boolean; description?: string;
  }>) {
    return prisma.$transaction([
      prisma.workExperience.deleteMany({ where: { candidateId } }),
      prisma.workExperience.createMany({ data: entries.map((e) => ({ candidateId, ...e })) as never }),
    ]);
  },

  replaceEducation(candidateId: string, entries: Array<{
    institution: string; degree: string; fieldOfStudy: string; startYear: number; endYear: number; grade?: string;
  }>) {
    return prisma.$transaction([
      prisma.candidateEducation.deleteMany({ where: { candidateId } }),
      prisma.candidateEducation.createMany({ data: entries.map((e) => ({ candidateId, ...e })) }),
    ]);
  },

  replaceCertifications(candidateId: string, entries: Array<{
    name: string; issuingOrg: string; issueDate: Date; expiryDate?: Date; credentialUrl?: string;
  }>) {
    return prisma.$transaction([
      prisma.certification.deleteMany({ where: { candidateId } }),
      prisma.certification.createMany({ data: entries.map((e) => ({ candidateId, ...e })) }),
    ]);
  },

  replaceLanguages(candidateId: string, entries: Array<{ language: string; fluency: string }>) {
    return prisma.$transaction([
      prisma.languageEntry.deleteMany({ where: { candidateId } }),
      prisma.languageEntry.createMany({ data: entries.map((e) => ({ candidateId, ...e })) as never }),
    ]);
  },

  // ── Freelance portfolio ─────────────────────────────────────────────────
  findPortfolioByCandidateId(candidateId: string) {
    return prisma.freelancePortfolio.findUnique({
      where: { candidateId },
      include: { projects: { include: { skills: { include: { skill: true } } }, orderBy: { displayOrder: 'asc' } }, services: { include: { skills: { include: { skill: true } } } } },
    });
  },

  upsertPortfolio(candidateId: string, data: Record<string, unknown>) {
    return prisma.freelancePortfolio.upsert({
      where: { candidateId },
      create: { candidateId, ...data } as never,
      update: data as never,
    });
  },

  async ensurePortfolio(candidateId: string) {
    const existing = await prisma.freelancePortfolio.findUnique({ where: { candidateId } });
    if (existing) return existing;
    return prisma.freelancePortfolio.create({ data: { candidateId } });
  },

  createProject(portfolioId: string, data: { skillIds: string[]; [k: string]: unknown }) {
    const { skillIds, ...rest } = data;
    return prisma.portfolioProject.create({
      data: {
        portfolioId, ...rest,
        skills: { create: skillIds.map((skillId) => ({ skillId })) },
      } as never,
      include: { skills: { include: { skill: true } } },
    });
  },

  findProjectById(id: string) {
    return prisma.portfolioProject.findUnique({ where: { id }, include: { portfolio: true } });
  },

  async updateProject(id: string, data: { skillIds?: string[]; [k: string]: unknown }) {
    const { skillIds, ...rest } = data;
    return prisma.$transaction(async (tx) => {
      if (skillIds) {
        await tx.portfolioProjectSkill.deleteMany({ where: { projectId: id } });
        await tx.portfolioProjectSkill.createMany({ data: skillIds.map((skillId) => ({ projectId: id, skillId })) });
      }
      return tx.portfolioProject.update({
        where: { id }, data: rest as never,
        include: { skills: { include: { skill: true } } },
      });
    });
  },

  deleteProject(id: string) {
    return prisma.portfolioProject.delete({ where: { id } });
  },

  createService(portfolioId: string, data: { skillIds: string[]; [k: string]: unknown }) {
    const { skillIds, ...rest } = data;
    return prisma.freelanceService.create({
      data: {
        portfolioId, ...rest,
        skills: { create: skillIds.map((skillId) => ({ skillId })) },
      } as never,
      include: { skills: { include: { skill: true } } },
    });
  },

  findServiceById(id: string) {
    return prisma.freelanceService.findUnique({ where: { id }, include: { portfolio: true } });
  },

  async updateService(id: string, data: { skillIds?: string[]; [k: string]: unknown }) {
    const { skillIds, ...rest } = data;
    return prisma.$transaction(async (tx) => {
      if (skillIds) {
        await tx.freelanceServiceSkill.deleteMany({ where: { serviceId: id } });
        await tx.freelanceServiceSkill.createMany({ data: skillIds.map((skillId) => ({ serviceId: id, skillId })) });
      }
      return tx.freelanceService.update({
        where: { id }, data: rest as never,
        include: { skills: { include: { skill: true } } },
      });
    });
  },

  deleteService(id: string) {
    return prisma.freelanceService.delete({ where: { id } });
  },

  findReviewsByRevieweeId(userId: string) {
    return prisma.review.findMany({
      where: { revieweeId: userId, isPublished: true },
      include: { reviewer: { select: { fullName: true, profileImage: true } } },
      orderBy: { createdAt: 'desc' }
    });
  },

  // ── Recruiter profile & company ─────────────────────────────────────────
  findRecruiterByUserId(userId: string) {
    return prisma.recruiterProfile.findUnique({
      where: { userId },
      include: {
        user: true,
        company: true,
        kycSubmissions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
  },

  updateRecruiterFields(recruiterId: string, userId: string, data: { fullName?: string; phone?: string | null; designation?: string | null; profileImage?: string | null; isSolo?: boolean }) {
    const { fullName, phone, profileImage, designation, isSolo } = data;
    return prisma.$transaction(async (tx) => {
      if (fullName !== undefined || phone !== undefined || profileImage !== undefined) {
        await tx.user.update({
          where: { id: userId },
          data: {
            fullName: fullName || undefined,
            phone: phone || null,
            profileImage: profileImage || null,
          }
        });
      }
      const updateData: any = {};
      if (designation !== undefined) updateData.designation = designation;
      if (isSolo !== undefined) {
        updateData.isSolo = isSolo;
        if (isSolo) {
          updateData.companyId = null; // Clear company link if recruiter is solo
        }
      }
      return tx.recruiterProfile.update({
        where: { id: recruiterId },
        data: updateData,
        include: { user: true, company: true },
      });
    });
  },

  async upsertCompany(recruiterId: string, data: {
    name: string; website?: string | null; logoUrl?: string | null; industry?: string | null; description?: string | null;
  }) {
    return prisma.$transaction(async (tx) => {
      const company = await tx.company.upsert({
        where: { name: data.name },
        create: data,
        update: data,
      });
      await tx.recruiterProfile.update({ where: { id: recruiterId }, data: { companyId: company.id, isSolo: false } });
      return company;
    });
  },

  // ── Verification (recruiter side) ───────────────────────────────────────
  markPaymentMethodVerified(recruiterId: string) {
    return prisma.recruiterProfile.update({
      where: { id: recruiterId }, data: { paymentMethodVerified: true, paymentVerifiedAt: new Date() },
    });
  },

  countPriorRejectedKyc(recruiterId: string) {
    return prisma.kycSubmission.count({ where: { recruiterId, status: 'REJECTED' } });
  },

  async createKycSubmission(recruiterId: string, userId: string, data: {
    kycType: 'INDIVIDUAL' | 'BUSINESS';
    documents: Array<{ fileUrl: string; fileName: string; mimeType: string; sizeBytes: number }>;
    isSecondSubmission: boolean;
  }) {
    return prisma.$transaction(async (tx) => {
      // Clean up previous submissions to prevent unique constraint violation on recruiterId
      await tx.kycSubmission.deleteMany({
        where: { recruiterId },
      });

      // Compute nameMatch status by comparing document fileName (without extension) with profile name
      let nameMatch = false;
      const primaryDoc = data.documents[0];
      if (primaryDoc) {
        const docNameOnly = primaryDoc.fileName.substring(0, primaryDoc.fileName.lastIndexOf('.')) || primaryDoc.fileName;
        const normalizedDocName = docNameOnly.trim().toLowerCase();

        if (data.kycType === 'INDIVIDUAL') {
          const user = await tx.user.findUnique({ where: { id: userId } });
          if (user && user.fullName.trim().toLowerCase() === normalizedDocName) {
            nameMatch = true;
          }
        } else if (data.kycType === 'BUSINESS') {
          const recProfile = await tx.recruiterProfile.findUnique({
            where: { id: recruiterId },
            include: { company: true },
          });
          if (recProfile && recProfile.company && recProfile.company.name.trim().toLowerCase() === normalizedDocName) {
            nameMatch = true;
          }
        }
      }

      const submission = await tx.kycSubmission.create({
        data: {
          recruiterId, kycType: data.kycType,
          isSecondSubmission: data.isSecondSubmission, status: 'PENDING',
          nameMatch,
        },
      });
      for (const doc of data.documents) {
        await tx.attachment.create({
          data: {
            ownerType: 'KYC_SUBMISSION', ownerId: submission.id, uploadedById: userId,
            fileUrl: doc.fileUrl, fileName: doc.fileName, mimeType: doc.mimeType,
            sizeBytes: BigInt(doc.sizeBytes),
          },
        });
      }
      await tx.recruiterProfile.update({ where: { id: recruiterId }, data: { kycStatus: 'PENDING' } });
      return submission;
    });
  },

  async searchCandidates(query: any) {
    const where: any = {
      openToFreelance: true,
    };

    if (query.q) {
      const search = String(query.q).toLowerCase();
      where.OR = [
        { user: { fullName: { contains: search, mode: 'insensitive' } } },
        { headline: { contains: search, mode: 'insensitive' } },
        { skills: { some: { skill: { name: { contains: search, mode: 'insensitive' } } } } },
      ];
    }

    const portfolioWhere: any = {};
    let hasPortfolioFilter = false;

    if (query.minRate !== undefined && query.minRate !== '') {
      portfolioWhere.hourlyRate = portfolioWhere.hourlyRate || {};
      portfolioWhere.hourlyRate.gte = parseFloat(query.minRate);
      hasPortfolioFilter = true;
    }
    if (query.maxRate !== undefined && query.maxRate !== '') {
      portfolioWhere.hourlyRate = portfolioWhere.hourlyRate || {};
      portfolioWhere.hourlyRate.lte = parseFloat(query.maxRate);
      hasPortfolioFilter = true;
    }

    if (query.availableOnly === 'true' || query.availableOnly === true) {
      portfolioWhere.isAvailable = true;
      hasPortfolioFilter = true;
    }

    if (query.minRating !== undefined && query.minRating !== 'any' && query.minRating !== '') {
      portfolioWhere.avgRating = { gte: parseFloat(query.minRating) };
      hasPortfolioFilter = true;
    }

    if (query.capacity !== undefined && query.capacity !== 'any' && query.capacity !== '') {
      const capacityMap: any = {
        'under 10': 'UNDER_10',
        '10–20': 'H10_20',
        '20–40': 'H20_40',
        'full-time': 'FULL_TIME',
      };
      const enumVal = capacityMap[String(query.capacity).toLowerCase()];
      if (enumVal) {
        portfolioWhere.weeklyCapacity = enumVal;
        hasPortfolioFilter = true;
      }
    }

    if (hasPortfolioFilter) {
      where.portfolio = portfolioWhere;
    }

    if (query.location) {
      where.location = { contains: String(query.location), mode: 'insensitive' };
    }

    const orderBy: any = {};
    if (query.sort === 'RATING') {
      orderBy.portfolio = { avgRating: 'desc' };
    } else if (query.sort === 'CONTRACTS') {
      orderBy.portfolio = { totalContracts: 'desc' };
    } else if (query.sort === 'LOW_RATE') {
      orderBy.portfolio = { hourlyRate: 'asc' };
    } else {
      orderBy.createdAt = 'desc';
    }

    return prisma.candidateProfile.findMany({
      where,
      include: CANDIDATE_INCLUDE,
      orderBy,
    });
  },
};
