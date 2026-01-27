import { RequestHandler } from 'express';
import crypto from 'crypto';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import { initializeTransaction, verifyTransaction } from '../services/squad.service';
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
        provider: PaymentProvider.SQUAD,
        reference,
      },
    });
    await tx.user.update({ where: { id: user.id }, data: { role: Role.STUDENT } });
  });
  res.json({ ok: true, email, role: 'STUDENT', reference });
});

import { signAccessToken, signRefreshToken } from '../auth/jwt';

export const initializePublicPayment: RequestHandler = asyncHandler(async (req, res) => {
  // console.log('Starting initializePublicPayment...');
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

  // console.log('Finding user by email:', email);
  let user = await prisma.user.findUnique({ where: { email }, include: { profile: true } });

  if (!user) {
    // console.log('User not found, creating new user...');
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
    // console.log('New user created:', user.id);
  } else {
    console.log('User found:', user.id);
  }

  // Ensure profile exists
  let profileId = user.profile?.id;
  if (!profileId) {
    // console.log('Creating student profile...');
    const studentIdCode = `STD-${crypto.randomInt(100000, 999999)}`;
    const profile = await prisma.studentProfile.create({
      data: { userId: user.id, studentIdCode, progress: 0 },
    });
    profileId = profile.id;
    console.log('Student profile created:', profileId);
  }

  let finalAmount = 35000; // Default new price

  // If client sends specific amount (e.g. partial), use it, otherwise use default
  if (typeof amount === 'number' && amount > 0) {
    finalAmount = amount;
  }

  // Apply Discount if provided (and if using default price logic or explicit check)
  // We generally apply discount to the base price.
  if (discountCode) {
    const code = await prisma.discountCode.findUnique({
      where: { code: discountCode },
    });
    if (code && code.isActive) {
      const discountAmount = (finalAmount * code.discountPercentage) / 100;
      finalAmount = finalAmount - discountAmount;
      console.log(
        `Applied discount ${code.code}: -${discountAmount} (${code.discountPercentage}%)`,
      );
    } else {
      res.status(400).json({ error: 'Invalid or expired discount code' });
      return;
    }
  }

  console.log('Initializing Squad transaction with amount:', finalAmount);

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
  console.log('Squad initialized, reference:', squadData.data.reference);

  await prisma.payment.create({
    data: {
      studentId: profileId,
      amount: finalAmount,
      currency: 'NGN',
      status: PaymentStatus.PENDING,
      method: PaymentMethod.CARD,
      provider: PaymentProvider.SQUAD,
      reference: squadData.data.reference,
    },
  });
  console.log('Payment record created locally.');

  res.json({
    authorizationUrl: squadData.data.authorization_url,
    reference: squadData.data.reference,
  });
});

export const initiatePayment: RequestHandler = asyncHandler(async (req, res) => {
  const userId = res.locals.user?.id;
  console.log('Initiating payment for user:', userId);
  if (!userId) throw new UnauthorizedError('User not authenticated');

  const { plan, discountCode } = req.body as { plan?: 'full' | 'deposit'; discountCode?: string };
  console.log('Payment plan requested:', plan);

  const user = await prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });

  if (!user) throw new UnauthorizedError('User not found');
  if (user.role === Role.STUDENT) {
    res.status(400).json({ message: 'User is already a student' });
    return;
  }

  // Pricing Logic
  // Full: 35,000 NGN (Updated)
  // Deposit: Let's keep existing ratio or manual? User didn't specify deposit change.
  // Assuming 35k is the new base.
  let amount = 35000;
  if (plan === 'deposit') {
    amount = 20000; // Keep deposit same or scale? Let's keep 20k for now unless told otherwise, or maybe 25k?
    // User only said "course has been increased to 35,000".
    // I will stick to 35,000 for full.
  }

  if (discountCode) {
    const code = await prisma.discountCode.findUnique({
      where: { code: discountCode },
    });
    if (code && code.isActive) {
      const discountAmount = (amount * code.discountPercentage) / 100;
      amount = amount - discountAmount;
      console.log(
        `Applied discount ${code.code}: -${discountAmount} (${code.discountPercentage}%)`,
      );
    } else {
      res.status(400).json({ error: 'Invalid or expired discount code' });
      return;
    }
  }

  const squadData = await initializeTransaction(
    user.email,
    amount,
    `${env.APP_URL}/dashboard`, // Redirect back to dashboard after payment
    {
      plan: plan || 'full',
      userId: user.id,
      discountCode: discountCode || null,
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
      provider: PaymentProvider.SQUAD,
      reference: squadData.data.reference,
    },
  });

  res.json({
    authorizationUrl: squadData.data.authorization_url,
    reference: squadData.data.reference,
  });
});

export const squadWebhook: RequestHandler = asyncHandler(async (req, res) => {
  const signature = req.headers['x-squad-encrypted-body'];
  if (!signature) {
    res.status(401).send('No signature');
    return;
  }

  const hash = crypto
    .createHmac('sha512', env.SQUAD_SECRET_KEY)
    .update((req as unknown as { rawBody?: Buffer }).rawBody || JSON.stringify(req.body))
    .digest('hex')
    .toUpperCase();

  if (hash !== signature) {
    res.status(401).send('Invalid signature');
    return;
  }

  const event = req.body;
  console.log('Squad Webhook Event:', JSON.stringify(event, null, 2));

  // Squad webhook structure varies, but usually contains transaction details.
  // We look for transaction_ref or similar.
  // Based on docs, it might be directly in the body or in a data field.
  const reference = event.transaction_ref || event.data?.transaction_ref;

  if (reference) {
    // Verify status from the event or re-verify with API
    // To be safe, let's verify with API as the event structure might be 'charge.success' equivalent?
    // Squad docs don't strictly specify an 'event' field like Paystack.
    // But they send the transaction details.

    // We can just trigger verification
    const verification = await verifyTransaction(reference);
    const status = (verification.data as { status?: string })?.status;

    if (status === 'success') {
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
              receiptURL: null, // Squad receipt URL if available?
            },
          });

          // Upgrade User to STUDENT and Activate
          await tx.user.update({
            where: { id: payment.student.userId },
            data: {
              role: Role.STUDENT,
              status: 'ACTIVE',
            } as any,
          });
        });
      }
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
        data: {
          role: Role.STUDENT,
          status: 'ACTIVE',
        } as any,
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
      const accessToken = signAccessToken({
        sub: freshUser.id,
        role: freshUser.role,
        passwordSet: !!freshUser.passwordHash,
      });
      const refreshToken = signRefreshToken({
        sub: freshUser.id,
        role: freshUser.role,
        jti,
        passwordSet: !!freshUser.passwordHash,
      });
      tokens = { accessToken, refreshToken };
    }
  }

  res.json({ status: updated?.status, reference, tokens });
});
