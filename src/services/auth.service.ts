import { Role } from '@prisma/client';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../auth/jwt';
import { revokeRefreshJti, isRevoked } from '../auth/tokenStore';
import { ConflictError, UnauthorizedError } from '../utils/errors';

import { toUserResponse } from '../utils/transformers';

// Service to handle user registration
export async function registerUser(
  email: string,
  password: string,
  name: string,
  phoneNumber?: string,
  role: Role = Role.APPLICANT,
) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new ConflictError('Email already taken');
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, passwordHash, role, name, phoneNumber },
  });
  await prisma.notificationPref.create({
    data: { userId: user.id, emailNews: false, emailAssignments: true, emailGrades: true },
  });

  if (role === Role.STUDENT || role === Role.APPLICANT) {
    // Generate a simple student ID code (even for applicants, they get a profile)
    const studentIdCode = `STD-${crypto.randomInt(100000, 999999)}`;
    await prisma.studentProfile.create({
      data: {
        userId: user.id,
        studentIdCode,
        progress: 0,
      },
    });
  }

  const jti = crypto.randomUUID();
  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  const refreshToken = signRefreshToken({ sub: user.id, role: user.role, jti });

  return {
    user: toUserResponse(user),
    accessToken,
    refreshToken,
  };
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new UnauthorizedError('Invalid credentials');

  // Debug logging
  console.log('Login attempt for:', email);
  console.log('Provided password:', password);
  console.log('Stored hash:', user.passwordHash);

  const ok = await bcrypt.compare(password, user.passwordHash);
  console.log('Bcrypt compare result:', ok);

  if (!ok) throw new UnauthorizedError('Invalid credentials');
  const jti = crypto.randomUUID();
  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  const refreshToken = signRefreshToken({ sub: user.id, role: user.role, jti });
  return { accessToken, refreshToken };
}

export async function refreshTokens(refreshToken: string) {
  const payload = verifyRefreshToken(refreshToken);
  if (payload.jti && (await isRevoked(payload.jti)))
    throw new UnauthorizedError('Refresh token revoked');
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) throw new UnauthorizedError('Unauthorized');
  const newJti = crypto.randomUUID();
  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  const newRefreshToken = signRefreshToken({ sub: user.id, role: user.role, jti: newJti });
  if (payload.jti) await revokeRefreshJti(payload.jti, 7 * 24 * 60 * 60);
  return { accessToken, refreshToken: newRefreshToken };
}

export async function logoutWithRefresh(refreshToken: string) {
  try {
    const payload = verifyRefreshToken(refreshToken);
    if (payload.jti) await revokeRefreshJti(payload.jti, 7 * 24 * 60 * 60);
  } catch (e) {
    // noop
  }
  return { ok: true };
}

export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { ok: true };
  const token = crypto.randomUUID();
  await prisma.passwordResetToken.upsert({
    where: { userId: user.id },
    update: { token, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    create: { userId: user.id, token, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
  });
  return { ok: true };
}

export async function confirmPasswordReset(token: string, newPassword: string) {
  const record = await prisma.passwordResetToken.findFirst({
    where: { token, expiresAt: { gt: new Date() } },
  });
  if (!record) throw new UnauthorizedError('Invalid reset token');
  const hash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: record.userId }, data: { passwordHash: hash } });
  await prisma.passwordResetToken.delete({ where: { userId: record.userId } });
  return { ok: true };
}
