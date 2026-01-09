
import { api } from './setup';
import { Role, PaymentStatus } from '@prisma/client';

// Mock dependencies
jest.mock('../src/lib/prisma', () => {
  const users: any[] = [];
  const payments: any[] = [];
  const profiles: any[] = [];

  return {
    prisma: {
      user: {
        findUnique: jest.fn(async ({ where }: any) => {
          return users.find((u) => u.email === where.email || u.id === where.id) || null;
        }),
        create: jest.fn(async ({ data }: any) => {
          const u = { 
            id: 'user-' + Date.now(), 
            ...data,
            profile: null 
          };
          users.push(u);
          return u;
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const u = users.find((u) => u.id === where.id);
          if (u) {
            Object.assign(u, data);
            return u;
          }
          return null;
        }),
      },
      studentProfile: {
        create: jest.fn(async ({ data }: any) => {
            const p = { id: 'profile-' + Date.now(), ...data };
            profiles.push(p);
            // Link back to user
            const u = users.find(u => u.id === data.userId);
            if (u) u.profile = p;
            return p;
        })
      },
      payment: {
        create: jest.fn(async ({ data }: any) => {
          const p = { id: 'pay-' + Date.now(), ...data };
          payments.push(p);
          return p;
        }),
        findUnique: jest.fn(async ({ where }: any) => {
          const p = payments.find((p) => p.reference === where.reference || p.id === where.id);
          if (p) {
             // mimic include student which has userId
             const profile = profiles.find(prof => prof.id === p.studentId);
             return { ...p, student: { userId: profile?.userId } };
          }
          return null;
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const p = payments.find((p) => p.id === where.id);
          if (p) {
            Object.assign(p, data);
            return p;
          }
          return null;
        }),
      },
      notificationPref: {
        create: jest.fn(async () => ({})),
      },
      $transaction: jest.fn(async (callback) => callback(require('../src/lib/prisma').prisma)),
    },
  };
});

jest.mock('../src/services/paystack.service', () => ({
  initializeTransaction: jest.fn(async (email, amount, cb, meta) => ({
    status: true,
    message: 'Authorization URL created',
    data: {
      authorization_url: 'https://checkout.paystack.com/test-ref',
      access_code: 'test-access-code',
      reference: 'test-ref-' + Date.now(),
    },
  })),
  verifyTransaction: jest.fn(async (reference) => ({
    status: true,
    message: 'Verification successful',
    data: {
      status: 'success',
      reference,
      amount: 3000000,
    },
  })),
}));

// We need to clear mocks/data between tests if we want isolation, 
// but for this flow test we want persistence across steps in the same test file 
// (or we rely on the closure variables above which persist for the file execution).
// The closure variables `users`, `payments` persist across tests in this file.

describe('Payment-First Registration Flow', () => {
  let userEmail = 'test-flow@example.com';
  let paymentReference = '';
  let authToken = '';
  let userId = '';

  it('1. Initialize Public Payment (No Password)', async () => {
    const res = await api().post('/api/payments/initialize-public').send({
      email: userEmail,
      name: 'Test Flow User',
      phoneNumber: '08012345678',
      amount: 30000,
      plan: 'full',
    });

    expect(res.status).toBe(200);
    expect(res.body.authorizationUrl).toBeDefined();
    expect(res.body.reference).toBeDefined();
    
    paymentReference = res.body.reference;
  });

  it('2. Verify Payment (Public -> Login)', async () => {
    const res = await api().post('/api/payments/verify').send({
      reference: paymentReference,
    });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe(PaymentStatus.PAID);
    expect(res.body.tokens).toBeDefined();
    expect(res.body.tokens.accessToken).toBeDefined();

    authToken = res.body.tokens.accessToken;
  });

  it('3. Set Password (First time setup)', async () => {
    const res = await api()
      .patch('/api/users/me/password')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        currentPassword: null, // Should be allowed
        newPassword: 'securePassword123!',
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('4. Verify Password is Set (Cannot use null currentPassword again)', async () => {
    // Attempt to set password again with null currentPassword should fail 
    // because passwordHash is no longer 'NOT_SET' (it's hashed now).
    // Note: The mock implementation of update just updates fields. 
    // The real logic uses bcrypt.compare or checks 'NOT_SET'.
    // Since we are running the REAL service/controller logic (only prisma is mocked),
    // the `updatePasswordData` function in `users.service.ts` will run.
    
    const res = await api()
      .patch('/api/users/me/password')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        currentPassword: null, 
        newPassword: 'anotherPassword123!',
      });

    // Expect 401 Unauthorized because password is already set
    expect(res.status).toBe(401); 
  });
});
