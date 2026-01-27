import request from 'supertest';
import { jest } from '@jest/globals';
import { PaymentStatus } from '@prisma/client';

// 1. Mock Squad Service
jest.mock('../src/services/squad.service', () => ({
  initializeTransaction: jest.fn(),
  verifyTransaction: jest.fn(),
}));

// 2. Mock Prisma
// We need a simple in-memory store for users and payments to simulate state changes
const mockUsers: any[] = [];
const mockPayments: any[] = [];
const mockProfiles: any[] = [];

jest.mock('../src/lib/prisma', () => {
  return {
    prisma: {
      user: {
        findUnique: jest.fn(({ where }: any) => {
          return mockUsers.find((u) => u.email === where.email || u.id === where.id) || null;
        }),
        create: jest.fn(async ({ data }: any) => {
          const newUser = {
            id: 'user-' + Date.now(),
            ...data,
            status: data.status || 'ACTIVE', // Default from schema
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          mockUsers.push(newUser);
          return newUser;
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const userIndex = mockUsers.findIndex((u) => u.id === where.id);
          if (userIndex === -1) throw new Error('User not found');
          mockUsers[userIndex] = { ...mockUsers[userIndex], ...data };
          return mockUsers[userIndex];
        }),
      },
      studentProfile: {
        findUnique: jest.fn(({ where }: any) => {
          return mockProfiles.find((p) => p.userId === where.userId) || null;
        }),
        create: jest.fn(async ({ data }: any) => {
          const newProfile = { id: 'profile-' + Date.now(), ...data };
          mockProfiles.push(newProfile);
          return newProfile;
        }),
      },
      payment: {
        create: jest.fn(async ({ data }: any) => {
          const newPayment = {
            id: 'pay-' + Date.now(),
            ...data,
            status: data.status || PaymentStatus.PENDING,
          };
          mockPayments.push(newPayment);
          return newPayment;
        }),
        findUnique: jest.fn(({ where }: any) => {
          const payment = mockPayments.find(
            (p) => p.reference === where.reference || p.id === where.id,
          );
          if (payment) {
            // Mock include student relation
            payment.student = mockProfiles.find((p) => p.id === payment.studentId);
            // And student.userId need to be resolvable if needed, but here we just need student object with userId
          }
          return payment || null;
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const idx = mockPayments.findIndex((p) => p.id === where.id);
          if (idx === -1) throw new Error('Payment not found');
          mockPayments[idx] = { ...mockPayments[idx], ...data };
          return mockPayments[idx];
        }),
      },
      notificationPref: {
        create: jest.fn(),
      },
      discountCode: {
        findUnique: jest.fn(() => null),
      },
      $transaction: jest.fn(async (callback: any) => {
        // Pass the mocked prisma as tx
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { prisma } = require('../src/lib/prisma');
        return callback(prisma);
      }),
    },
  };
});

// Import app after mocks
import app from '../src/app';
import { initializeTransaction, verifyTransaction } from '../src/services/squad.service';
import { signAccessToken } from '../src/auth/jwt';

describe('Payment-First Registration Flow', () => {
  beforeEach(() => {
    // Clear in-memory stores
    mockUsers.length = 0;
    mockPayments.length = 0;
    mockProfiles.length = 0;
    jest.clearAllMocks();
  });

  const testUser = {
    email: 'test@example.com',
    name: 'Test User',
    phoneNumber: '08012345678',
  };

  test('1. registerAndPay creates pending user and returns payment URL', async () => {
    (initializeTransaction as unknown as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        status: 200,
        success: true,
        message: 'Success',
        data: {
          authorization_url: 'https://squad.co/pay/test',
          access_token: '',
          customer_name: 'Test',
          customer_email: 'test@example.com',
          checkout_url: '',
          reference: 'SQ_REF_TEST',
          merchant_info: {},
          currency: 'NGN',
        },
      }),
    );

    const res = await request(app).post('/api/auth/register-and-pay').send(testUser).expect(200);

    expect(res.body).toHaveProperty('authorizationUrl');
    expect(res.body.reference).toBe('SQ_REF_TEST');

    // Verify DB state
    const user = mockUsers.find((u) => u.email === testUser.email);
    expect(user).toBeDefined();
    expect(user.status).toBe('PENDING_PAYMENT'); // String literal for enum
    expect(user.role).toBe('APPLICANT');
    expect(user.passwordHash).toBeNull();

    const payment = mockPayments.find((p) => p.reference === 'SQ_REF_TEST');
    expect(payment).toBeDefined();
    expect(payment.status).toBe('PENDING');
  });

  test('2. verifyPayment updates user status and returns tokens', async () => {
    // Setup initial state: Pending User and Payment
    const user = {
      id: 'user-1',
      email: testUser.email,
      name: testUser.name,
      role: 'APPLICANT',
      status: 'PENDING_PAYMENT',
      passwordHash: null,
    };
    mockUsers.push(user);

    const profile = {
      id: 'profile-1',
      userId: user.id,
      studentIdCode: 'STD-123',
    };
    mockProfiles.push(profile);

    const payment = {
      id: 'pay-1',
      studentId: profile.id,
      reference: 'SQ_REF_TEST',
      status: 'PENDING',
      amount: 35000,
      student: profile, // Relation for mock
    };
    mockPayments.push(payment);

    // Mock Squad Verification
    (verifyTransaction as unknown as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        status: 200,
        success: true,
        data: {
          status: 'success',
          transaction_ref: 'SQ_REF_TEST',
          transaction_amount: 35000,
          currency: 'NGN',
          // other fields...
        },
      }),
    );

    const res = await request(app)
      .post('/api/payments/verify')
      .send({ reference: 'SQ_REF_TEST' })
      .expect(200);

    expect(res.body.status).toBe('PAID');
    expect(res.body.tokens).toBeDefined();
    expect(res.body.tokens.accessToken).toBeDefined();

    // Verify DB Update
    const updatedUser = mockUsers.find((u) => u.id === user.id);
    expect(updatedUser.role).toBe('STUDENT'); // String literal
    expect(updatedUser.status).toBe('ACTIVE');

    const updatedPayment = mockPayments.find((p) => p.id === payment.id);
    expect(updatedPayment.status).toBe('PAID');
  });

  test('3. setPassword sets password for active user', async () => {
    // Setup: Active User with tokens (simulated)
    const user = {
      id: 'user-1',
      email: testUser.email,
      role: 'STUDENT',
      status: 'ACTIVE',
      passwordHash: null, // Password not set
    };
    mockUsers.push(user);

    // We need to generate a valid token for the test or mock the auth middleware
    // Since mocking middleware is hard without changing app.ts, let's use the real jwt helper
    // assuming env vars are set in setup.ts
    const token = signAccessToken({ sub: user.id, role: user.role as any, passwordSet: false });

    const res = await request(app)
      .post('/api/auth/set-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ password: 'NewSecurePassword123!' })
      .expect(200);

    expect(res.body.success).toBe(true);

    const updatedUser = mockUsers.find((u) => u.id === user.id);
    expect(updatedUser.passwordHash).not.toBeNull();
  });

  test('4. registerAndPay rejects existing active user', async () => {
    // Setup existing active user
    mockUsers.push({
      id: 'active-user',
      email: 'active@example.com',
      name: 'Active User',
      status: 'ACTIVE',
      role: 'STUDENT',
    });

    const res = await request(app)
      .post('/api/auth/register-and-pay')
      .send({
        email: 'active@example.com',
        name: 'Active User',
        phoneNumber: '08011111111',
      })
      .expect(409); // Conflict

    expect(res.body.error).toMatch(/already exists/i);
  });

  test('5. registerAndPay re-initializes for pending user', async () => {
    // Setup pending user
    mockUsers.push({
      id: 'pending-user',
      email: 'pending@example.com',
      name: 'Pending User',
      status: 'PENDING_PAYMENT',
      role: 'APPLICANT',
    });

    (initializeTransaction as unknown as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        status: 200,
        success: true,
        data: {
          authorization_url: 'https://squad.co/pay/retry',
          reference: 'SQ_REF_RETRY',
          // ...
        },
      }),
    );

    const res = await request(app)
      .post('/api/auth/register-and-pay')
      .send({
        email: 'pending@example.com',
        name: 'Pending User',
        phoneNumber: '08022222222',
      })
      .expect(200);

    expect(res.body.reference).toBe('SQ_REF_RETRY');
    // Should create a NEW payment
    const payment = mockPayments.find((p) => p.reference === 'SQ_REF_RETRY');
    expect(payment).toBeDefined();
  });
});
