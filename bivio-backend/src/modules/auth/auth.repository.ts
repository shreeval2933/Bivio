import { prisma } from '../../shared/prisma';
import type { Prisma } from '@prisma/client';

export const authRepository = {
  findUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      include: { candidateProfile: true, recruiterProfile: true, adminProfile: true },
    });
  },

  findUserById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: { candidateProfile: true, recruiterProfile: { include: { company: true } }, adminProfile: true },
    });
  },

  async createCandidate(data: {
    fullName: string; email: string; passwordHash: string; verifyToken: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          fullName: data.fullName,
          email: data.email,
          passwordHash: data.passwordHash,
          role: 'CANDIDATE',
          accountStatus: 'PENDING_VERIFICATION',
        },
      });
      const candidate = await tx.candidateProfile.create({
        data: { userId: user.id },
      });
      await tx.wallet.create({ data: { userId: user.id } });
      return { user, candidate };
    });
  },

  async createRecruiter(data: {
    fullName: string; email: string; passwordHash: string;
    jobTitle?: string; companyName?: string; contactNumber?: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          fullName: data.fullName,
          email: data.email,
          passwordHash: data.passwordHash,
          phone: data.contactNumber,
          role: 'RECRUITER',
          accountStatus: 'PENDING_VERIFICATION',
        },
      });

      let companyId: string | undefined;
      const isSolo = !data.companyName;
      if (data.companyName) {
        const company = await tx.company.upsert({
          where: { name: data.companyName },
          create: { name: data.companyName },
          update: {},
        });
        companyId = company.id;
      }

      const recruiter = await tx.recruiterProfile.create({
        data: {
          userId: user.id,
          designation: data.jobTitle,
          isSolo,
          companyId,
        },
      });
      return { user, recruiter };
    });
  },

  setEmailVerified(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { isVerified: true, accountStatus: 'ACTIVE' },
    });
  },

  updatePasswordHash(userId: string, passwordHash: string) {
    return prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  },

  touchLastLogin(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date(), lastActiveAt: new Date() },
    });
  },
};

export type AuthRepository = typeof authRepository;
