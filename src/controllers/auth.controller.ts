import { type RequestHandler } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { verifyRefreshToken } from '../auth/jwt';
import { revokeRefreshJti } from '../auth/tokenStore';
import { registerUser, loginUser, refreshTokens } from '../services/auth.service';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
  resetRequestSchema,
  resetConfirmSchema,
} from '../validators/auth';
import { ValidationError } from '../utils/errors';
import { asyncHandler } from '../utils/asyncHandler';

export const register: RequestHandler = asyncHandler(async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues);
  }
  const result = await registerUser(
    parsed.data.email,
    parsed.data.password,
    parsed.data.name,
    parsed.data.phoneNumber,
    parsed.data.role,
  );
  res.status(201).json(result);
});

export const login: RequestHandler = asyncHandler(async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues);
  }
  const tokens = await loginUser(parsed.data.email, parsed.data.password);
  res.json(tokens);
});

export const refresh: RequestHandler = asyncHandler(async (req, res) => {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues);
  }
  const tokens = await refreshTokens(parsed.data.refreshToken);
  res.json(tokens);
});

export const logout: RequestHandler = asyncHandler(async (req, res) => {
  const parsed = logoutSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues);
  }
  try {
    const payload = verifyRefreshToken(parsed.data.refreshToken);
    if (payload.jti) {
      await revokeRefreshJti(payload.jti, 7 * 24 * 60 * 60);
    }
    res.status(200).json({ ok: true });
  } catch {
    res.status(200).json({ ok: true });
  }
});

export const requestPasswordReset: RequestHandler = asyncHandler(async (req, res) => {
  const parsed = resetRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues);
  }
  const { email } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(200).json({ message: 'Password reset email sent' });
    return;
  }
  const token = crypto.randomUUID();
  await prisma.passwordResetToken.upsert({
    where: { userId: user.id },
    update: { token, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    create: { userId: user.id, token, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
  });
  res.status(200).json({ message: 'Password reset email sent' });
});

export const confirmPasswordReset: RequestHandler = asyncHandler(async (req, res) => {
  const parsed = resetConfirmSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues);
  }
  const { token, newPassword } = parsed.data;
  const record = await prisma.passwordResetToken.findFirst({
    where: { token, expiresAt: { gt: new Date() } },
  });
  if (!record) {
    throw new ValidationError([{ message: 'Invalid or expired token' }]);
  }
  const hash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: record.userId }, data: { passwordHash: hash } });
  await prisma.passwordResetToken.delete({ where: { userId: record.userId } });
  res.status(200).json({ message: 'Password successfully reset' });
});
