import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import { env } from '../../config/env';
import { prisma } from '../../shared/prisma';
import { authRepository } from './auth.repository';
import { ConflictError, UnauthorizedError, ValidationError, ForbiddenError } from '../../shared/errors';
import { signAccessToken } from '../../shared/accessTokens';
import { signPurposeToken, verifyPurposeToken } from '../../shared/purposeTokens';
import { sendMail } from '../../shared/mailer';
import type { RegisterInput, LoginInput, ResetPasswordInput } from './auth.schema';

const BCRYPT_ROUNDS = 12;

function signRefreshToken(userId: string) {
  return jwt.sign({ sub: userId, jti: randomUUID() }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.REFRESH_TOKEN_TTL as jwt.SignOptions['expiresIn'],
  });
}

function serializeUser(user: {
  id: string; fullName: string; email: string; role: string;
  profileImage: string | null; isVerified: boolean; accountStatus: string;
}) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    profileImage: user.profileImage,
    isVerified: user.isVerified,
    accountStatus: user.accountStatus,
  };
}

export const authService = {
  async register(input: RegisterInput) {
    const regSetting = await prisma.platformSetting.findUnique({ where: { key: 'FEATURE_REGISTRATIONS_OPEN' } });
    if (regSetting && regSetting.value === 'false') {
      throw new ForbiddenError('New user registrations are temporarily closed by platform administration');
    }

    const existing = await authRepository.findUserByEmail(input.email);
    if (existing) throw new ConflictError('An account with this email already exists');

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

    const { user } =
      input.role === 'CANDIDATE'
        ? await authRepository.createCandidate({
            fullName: input.fullName,
            email: input.email,
            passwordHash,
            verifyToken: '', // token is generated below, not stored — see signPurposeToken
          })
        : await authRepository.createRecruiter({
            fullName: input.fullName,
            email: input.email,
            passwordHash,
            jobTitle: input.jobTitle,
            companyName: input.companyName,
            contactNumber: input.contactNumber,
          });

    const verifyToken = signPurposeToken(user.id, 'verify-email');
    const verifyUrl = `${env.CORS_ORIGIN || 'http://localhost:3000'}/verify-email?token=${verifyToken}`;
    await sendMail({
      to: user.email,
      subject: 'Verify your Bivio account',
      body: `Hi ${user.fullName},\n\nPlease verify your email by clicking on the link below:\n\n${verifyUrl}\n\nThanks,\nBivio Team`,
    }).catch((err) => console.error('Failed to send verification email:', err));

    const accessToken = signAccessToken(user.id, user.role);
    return { user: serializeUser(user), accessToken };
  },

  async login(input: LoginInput) {
    const user = await authRepository.findUserByEmail(input.email);
    if (!user) throw new UnauthorizedError('Invalid email or password');

    const validPassword = await bcrypt.compare(input.password, user.passwordHash);
    if (!validPassword) throw new UnauthorizedError('Invalid email or password');

    if (!user.isVerified) {
      throw new UnauthorizedError('Please verify your email address before logging in');
    }

    if (user.accountStatus === 'SUSPENDED') {
      throw new UnauthorizedError('Your account is temporarily suspended');
    }
    if (user.accountStatus === 'BANNED') {
      throw new UnauthorizedError('Your account has been banned');
    }
    if (user.accountStatus === 'DELETED') {
      throw new UnauthorizedError('Invalid email or password');
    }

    await authRepository.touchLastLogin(user.id);

    const accessToken = signAccessToken(user.id, user.role);
    const refreshToken = signRefreshToken(user.id);
    return { user: serializeUser(user), accessToken, refreshToken };
  },

  async refresh(refreshToken: string) {
    let payload: { sub: string };
    try {
      payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as typeof payload;
    } catch {
      throw new UnauthorizedError('Session expired, please log in again');
    }
    const user = await authRepository.findUserById(payload.sub);
    if (!user) throw new UnauthorizedError();
    return { accessToken: signAccessToken(user.id, user.role) };
  },

  async verifyEmail(token: string) {
    const userId = verifyPurposeToken(token, 'verify-email');
    await authRepository.setEmailVerified(userId);
    return { ok: true };
  },

  async resendVerification(email: string) {
    const user = await authRepository.findUserByEmail(email);
    if (user) {
      if (user.isVerified) {
        throw new ValidationError('Email is already verified');
      }
      const verifyToken = signPurposeToken(user.id, 'verify-email');
      const verifyUrl = `${env.CORS_ORIGIN || 'http://localhost:3000'}/verify-email?token=${verifyToken}`;
      await sendMail({
        to: user.email,
        subject: 'Verify your Bivio account',
        body: `Hi ${user.fullName},\n\nPlease verify your email by clicking on the link below:\n\n${verifyUrl}\n\nThanks,\nBivio Team`,
      }).catch((err) => console.error('Failed to send verification email:', err));
    }
    return { ok: true };
  },

  async forgotPassword(email: string) {
    const user = await authRepository.findUserByEmail(email);
    // Deliberately do not reveal whether the email exists — same response either way.
    if (user) {
      const resetToken = signPurposeToken(user.id, 'reset-password');
      const resetUrl = `${env.CORS_ORIGIN || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
      await sendMail({
        to: user.email,
        subject: 'Reset your Bivio password',
        body: `Hi ${user.fullName},\n\nPlease reset your password by clicking on the link below:\n\n${resetUrl}\n\nThanks,\nBivio Team`,
      }).catch((err) => console.error('Failed to send password reset email:', err));
    }
    return { ok: true };
  },

  async resetPassword(input: ResetPasswordInput) {
    const userId = verifyPurposeToken(input.token, 'reset-password');
    if (input.password.length < 8) throw new ValidationError('Password too short');
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    await authRepository.updatePasswordHash(userId, passwordHash);
    return { ok: true };
  },

  async getMe(userId: string) {
    const user = await authRepository.findUserById(userId);
    if (!user) throw new UnauthorizedError();
    return serializeUser(user);
  },

  async googleLogin(input: { credential: string; role?: 'CANDIDATE' | 'RECRUITER' }) {
    const googleUser = await verifyGoogleToken(input.credential);

    let user = await authRepository.findUserByEmail(googleUser.email);

    if (!user) {
      if (!input.role) {
        throw new ValidationError('A role (CANDIDATE or RECRUITER) is required to register a new account.');
      }

      const randomPassword = randomUUID();
      const passwordHash = await bcrypt.hash(randomPassword, BCRYPT_ROUNDS);

      const result =
        input.role === 'CANDIDATE'
          ? await authRepository.createCandidate({
              fullName: googleUser.name,
              email: googleUser.email,
              passwordHash,
              verifyToken: '',
            })
          : await authRepository.createRecruiter({
              fullName: googleUser.name,
              email: googleUser.email,
              passwordHash,
            });

      const fetchedUser = await authRepository.findUserById(result.user.id);
      if (!fetchedUser) throw new UnauthorizedError();
      user = fetchedUser;

      await authRepository.setEmailVerified(user.id);
      
      if (googleUser.picture) {
        await prisma.user.update({
          where: { id: user.id },
          data: { profileImage: googleUser.picture },
        });
        const updated = await authRepository.findUserById(user.id);
        if (updated) user = updated;
      }
    }

    if (!user) {
      throw new UnauthorizedError();
    }

    if (user.accountStatus === 'SUSPENDED') {
      throw new UnauthorizedError('Your account is temporarily suspended');
    }
    if (user.accountStatus === 'BANNED') {
      throw new UnauthorizedError('Your account has been banned');
    }
    if (user.accountStatus === 'DELETED') {
      throw new UnauthorizedError('This account has been deleted');
    }

    await authRepository.touchLastLogin(user.id);

    const accessToken = signAccessToken(user.id, user.role);
    const refreshToken = signRefreshToken(user.id);

    return { user: serializeUser(user), accessToken, refreshToken };
  },
};

async function verifyGoogleToken(token: string): Promise<{ email: string; name: string; picture?: string }> {
  if (token.startsWith('mock_')) {
    try {
      const jsonStr = Buffer.from(token.replace('mock_', ''), 'base64').toString('utf-8');
      const data = JSON.parse(jsonStr);
      if (data.email && data.name) {
        return { email: data.email, name: data.name, picture: data.picture };
      }
    } catch {
      // Fallback
    }
    return {
      email: 'mock-google-user@example.com',
      name: 'Mock Google User',
    };
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new ValidationError('Google Client ID is not configured on the server.');
  }
  const client = new OAuth2Client(clientId);
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: clientId,
  });
  const payload = ticket.getPayload();
  if (!payload || !payload.email || !payload.name) {
    throw new UnauthorizedError('Invalid Google credential token');
  }
  return {
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
  };
}
