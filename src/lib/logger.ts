import pino from 'pino';

export const logger = pino({
  enabled: process.env.NODE_ENV !== 'test',
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  redact: [
    'password',
    'passwordHash',
    'SMTP_PASS',
    'PAYSTACK_SECRET_KEY',
    'STRIPE_SECRET',
    'STORAGE_SECRET_KEY',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
  ],
  transport:
    process.env.NODE_ENV === 'production'
      ? undefined
      : process.env.NODE_ENV === 'test'
        ? undefined
        : {
            target: 'pino-pretty',
            options: {
              colorize: true,
              ignore: 'hostname,req,res,responseTime',
              translateTime: 'SYS:standard',
            },
          },
});
