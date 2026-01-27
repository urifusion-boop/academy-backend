import { type RequestHandler } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { verifyRefreshToken } from '../auth/jwt';
import { revokeRefreshJti } from '../auth/tokenStore';
import { registerUser, loginUser, refreshTokens } from '../services/auth.service';
import { env } from '../config/env';
import { initializeTransaction } from '../services/squad.service';
import { PaymentStatus, PaymentMethod, PaymentProvider } from '@prisma/client';
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

export const registerAndPay: RequestHandler = asyncHandler(async (req, res) => {
  const { email, name, phoneNumber, amount, plan, callbackUrl, discountCode } = req.body as {
    email?: string;
    name?: string;
    phoneNumber?: string;
    amount?: number;
    plan?: string;
    callbackUrl?: string;
    discountCode?: string;
  };

  if (!email || !name) {
    res.status(400).json({ error: 'Email and Name are required' });
    return;
  }

  // 1. Validate email
  let user = await prisma.user.findUnique({ where: { email } });
  if (user && user.status === 'ACTIVE') {
    res.status(409).json({ error: 'User already exists' });
    return;
  }

  // 2. Create pending user record if not exists or if pending
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        name,
        phoneNumber,
        role: 'APPLICANT',
        passwordHash: null,
        status: 'PENDING_PAYMENT',
      },
    });
    // Initialize prefs
    await prisma.notificationPref.create({
      data: { userId: user.id, emailNews: false, emailAssignments: true, emailGrades: true },
    });
  } else {
    // If pending, just update details if needed
    // We can assume we just reuse the record
  }

  // 3. Initialize Payment
  // Ensure profile exists
  let profile = await prisma.studentProfile.findUnique({ where: { userId: user.id } });
  if (!profile) {
    const studentIdCode = `STD-${crypto.randomInt(100000, 999999)}`;
    profile = await prisma.studentProfile.create({
      data: { userId: user.id, studentIdCode, progress: 0 },
    });
  }

  // Calculate Amount
  let finalAmount = 35000;
  if (typeof amount === 'number' && amount > 0) finalAmount = amount;

  if (discountCode) {
    const code = await prisma.discountCode.findUnique({ where: { code: discountCode } });
    if (code && code.isActive) {
      const discountAmount = (finalAmount * code.discountPercentage) / 100;
      finalAmount = finalAmount - discountAmount;
    }
  }

  // Call Squad
  const squadData = await initializeTransaction(
    email,
    finalAmount,
    callbackUrl || `${env.APP_URL}/dashboard`,
    {
      plan: plan || 'full',
      userId: user.id,
      discountCode: discountCode || null,
    },
  );

  await prisma.payment.create({
    data: {
      studentId: profile.id,
      amount: finalAmount,
      currency: 'NGN',
      status: PaymentStatus.PENDING,
      method: PaymentMethod.CARD,
      provider: PaymentProvider.SQUAD,
      reference: squadData.data.reference,
    },
  });

  res.json({
    authorizationUrl: squadData.data.authorization_url,
    reference: squadData.data.reference,
  });
});

export const setPassword: RequestHandler = asyncHandler(async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters' });
    return;
  }

  const userId = res.locals.user.id;
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  if (user.passwordHash) {
    res.status(400).json({ error: 'Password already set. Use change password endpoint.' });
    return;
  }

  const hash = await bcrypt.hash(password, 12);
  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: hash,
      status: 'ACTIVE', // Ensure active
    },
  });

  res.json({ success: true, message: 'Password set successfully' });
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
