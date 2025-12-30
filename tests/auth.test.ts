import { api } from './setup';

jest.mock('../src/lib/prisma', () => {
  const users: any[] = [];
  const prefs: any[] = [];
  return {
    prisma: {
      user: {
        findUnique: jest.fn(
          async ({ where }: any) =>
            users.find((u) => u.email === where.email || u.id === where.id) || null,
        ),
        create: jest.fn(async ({ data }: any) => {
          const u = { id: 'u1', ...data };
          users.push(u);
          return u;
        }),
      },
      notificationPref: {
        create: jest.fn(async ({ data }: any) => {
          prefs.push(data);
          return data;
        }),
      },
      passwordResetToken: {
        upsert: jest.fn(async () => ({})),
        findFirst: jest.fn(async () => ({ userId: 'u1' })),
        delete: jest.fn(async () => ({})),
      },
    },
  };
});

jest.mock('../src/auth/tokenStore', () => ({
  revokeRefreshJti: jest.fn(async () => {}),
  isRevoked: jest.fn(async () => false),
}));

describe.skip('auth', () => {
  it('placeholder', () => {});
});
