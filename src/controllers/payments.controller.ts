import { RequestHandler } from 'express';
import crypto from 'crypto';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import { initializeTransaction, verifyTransaction } from '../services/paystack.service';
import { asyncHandler } from '../utils/asyncHandler';
import { UnauthorizedError } from '../utils/errors';
import { Role, PaymentStatus, PaymentMethod, PaymentProvider } from '@prisma/client';

export const markPaid: RequestHandler = asyncHandler(async (req, res) => {
  const { email, amount } = req.body as { email?: string; amount?: number };
  if (!email) {
    res.status(400).json({ error: 'Email is required' });
    return;
  }
  const user = await prisma.user.findUnique({ where: { email }, include: { profile: true } });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  let profileId = user.profile?.id;
  if (!profileId) {
    const studentIdCode = `STD-${crypto.randomInt(100000, 999999)}`;
    const profile = await prisma.studentProfile.create({
      data: { userId: user.id, studentIdCode, progress: 0 },
    });
    profileId = profile.id;
  }
  const reference = `manual-${Date.now()}`;
  const amt = typeof amount === 'number' && amount > 0 ? amount : 30000;
  await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        studentId: profileId!,
        amount: amt,
        currency: 'NGN',
        status: PaymentStatus.PAID,
        method: PaymentMethod.CARD,
        provider: PaymentProvider.PAYSTACK,
        reference,
      },
    });
    await tx.user.update({ where: { id: user.id }, data: { role: Role.STUDENT } });
  });
  res.json({ ok: true, email, role: 'STUDENT', reference });
});

import { signAccessToken, signRefreshToken } from '../auth/jwt';

export const initializePublicPayment: RequestHandler = asyncHandler(async (req, res) => {
  console.log('Starting initializePublicPayment...');
  const { email, name, phoneNumber, amount, plan, callbackUrl } = req.body as {
    email?: string;
    name?: string;
    phoneNumber?: string;
    amount?: number;
    plan?: string;
    callbackUrl?: string;
  };

  if (!email || !name) {
    res.status(400).json({ error: 'Email and Name are required' });
    return;
  }

  console.log('Finding user by email:', email);
  let user = await prisma.user.findUnique({ where: { email }, include: { profile: true } });

  if (!user) {
    console.log('User not found, creating new user...');
    // Create new user with placeholder password
    user = await prisma.user.create({
      data: {
        email,
        name,
        phoneNumber,
        role: Role.APPLICANT,
        passwordHash: 'NOT_SET',
      },
      include: { profile: true },
    });

    await prisma.notificationPref.create({
      data: { userId: user.id, emailNews: false, emailAssignments: true, emailGrades: true },
    });
    console.log('New user created:', user.id);
  } else {
    console.log('User found:', user.id);
  }

  // Ensure profile exists
  let profileId = user.profile?.id;
  if (!profileId) {
    console.log('Creating student profile...');
    const studentIdCode = `STD-${crypto.randomInt(100000, 999999)}`;
    const profile = await prisma.studentProfile.create({
      data: { userId: user.id, studentIdCode, progress: 0 },
    });
    profileId = profile.id;
    console.log('Student profile created:', profileId);
  }

  const amt = typeof amount === 'number' && amount > 0 ? amount : 30000;
  console.log('Initializing Paystack transaction with amount:', amt);

  const paystackData = await initializeTransaction(
    email,
    amt,
    callbackUrl || `${env.APP_URL}/dashboard`,
    {
      plan: plan || 'full',
      userId: user.id,
    },
  );
  console.log('Paystack initialized, reference:', paystackData.data.reference);

  await prisma.payment.create({
    data: {
      studentId: profileId,
      amount: amt,
      currency: 'NGN',
      status: PaymentStatus.PENDING,
      method: PaymentMethod.CARD,
      provider: PaymentProvider.PAYSTACK,
      reference: paystackData.data.reference,
    },
  });
  console.log('Payment record created locally.');

  res.json({
    authorizationUrl: paystackData.data.authorization_url,
    reference: paystackData.data.reference,
  });
});

export const initiatePayment: RequestHandler = asyncHandler(async (req, res) => {
  const userId = res.locals.user?.id;
  console.log('Initiating payment for user:', userId);
  if (!userId) throw new UnauthorizedError('User not authenticated');

  const { plan } = req.body as { plan?: 'full' | 'deposit' };
  console.log('Payment plan requested:', plan);

  const user = await prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });

  if (!user) throw new UnauthorizedError('User not found');
  if (user.role === Role.STUDENT) {
    res.status(400).json({ message: 'User is already a student' });
    return;
  }

  // Pricing Logic
  // Full: 30,000 NGN
  // Deposit (Installment): 20,000 NGN (Total 35,000)
  let amount = 30000;
  if (plan === 'deposit') {
    amount = 20000;
  }

  const paystackData = await initializeTransaction(
    user.email,
    amount,
    `${env.APP_URL}/dashboard`, // Redirect back to dashboard after payment
    {
      plan: plan || 'full',
      userId: user.id,
    },
  );

  // Ensure profile exists
  let profileId = user.profile?.id;
  if (!profileId) {
    const studentIdCode = `STD-${crypto.randomInt(100000, 999999)}`;
    const profile = await prisma.studentProfile.create({
      data: { userId: user.id, studentIdCode, progress: 0 },
    });
    profileId = profile.id;
  }

  await prisma.payment.create({
    data: {
      studentId: profileId,
      amount: amount,
      currency: 'NGN',
      status: PaymentStatus.PENDING,
      method: PaymentMethod.CARD,
      provider: PaymentProvider.PAYSTACK,
      reference: paystackData.data.reference,
    },
  });

  res.json({
    authorizationUrl: paystackData.data.authorization_url,
    reference: paystackData.data.reference,
  });
});

export const paystackWebhook: RequestHandler = asyncHandler(async (req, res) => {
  const signature = req.headers['x-paystack-signature'];
  if (!signature) {
    res.status(401).send('No signature');
    return;
  }

  const hash = crypto
    .createHmac('sha512', env.PAYSTACK_SECRET_KEY)
    .update((req as unknown as { rawBody?: Buffer }).rawBody || JSON.stringify(req.body))
    .digest('hex');

  if (hash !== signature) {
    res.status(401).send('Invalid signature');
    return;
  }

  const event = req.body;

  if (event.event === 'charge.success') {
    const reference = event.data.reference;

    const payment = await prisma.payment.findUnique({
      where: { reference },
      include: { student: true },
    });

    if (payment && payment.status !== PaymentStatus.PAID) {
      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.PAID,
            receiptURL: event.data.receipt_url || null, // receipt_url might be in metadata or data
          },
        });

        // Upgrade User to STUDENT
        await tx.user.update({
          where: { id: payment.student.userId },
          data: { role: Role.STUDENT },
        });
      });
    }
  }

  res.sendStatus(200);
});

export const verifyPayment: RequestHandler = asyncHandler(async (req, res) => {
  const { reference } = req.body as { reference?: string };
  console.log('Verifying payment reference:', reference);
  if (!reference) {
    res.status(400).json({ error: 'Reference is required' });
    return;
  }

  const record = await prisma.payment.findUnique({
    where: { reference },
    include: { student: true },
  });
  if (!record) {
    res.status(404).json({ error: 'Payment not found' });
    return;
  }

  let userId = res.locals.user?.id;
  if (userId) {
    if (record.student.userId !== userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
  } else {
    // Public verification logic: assume user is the one associated with payment
    userId = record.student.userId;
  }

  const verification = await verifyTransaction(reference);

  const status = (verification.data as { status?: string })?.status;

  if (status === 'success' && record.status !== PaymentStatus.PAID) {
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: record.id },
        data: { status: PaymentStatus.PAID },
      });
      await tx.user.update({
        where: { id: record.student.userId },
        data: { role: Role.STUDENT },
      });
    });
  } else if (status === 'failed' && record.status !== PaymentStatus.FAILED) {
    await prisma.payment.update({
      where: { id: record.id },
      data: { status: PaymentStatus.FAILED },
    });
  }

  const updated = await prisma.payment.findUnique({ where: { id: record.id } });

  // If payment is confirmed as PAID, we check if we need to return new tokens
  // This happens if the user's role was upgraded in this transaction or just before
  let tokens;
  if (updated?.status === PaymentStatus.PAID) {
    const freshUser = await prisma.user.findUnique({ where: { id: userId } });
    if (freshUser && freshUser.role === Role.STUDENT) {
      const jti = crypto.randomUUID();
      const accessToken = signAccessToken({ sub: freshUser.id, role: freshUser.role });
      const refreshToken = signRefreshToken({ sub: freshUser.id, role: freshUser.role, jti });
      tokens = { accessToken, refreshToken };
    }
  }

  res.json({ status: updated?.status, reference, tokens });
});
