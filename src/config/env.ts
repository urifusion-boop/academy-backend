import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().default('3000'),
  HTTP_PORT: z.string().default('3000'),
  HTTPS_PORT: z.string().default('3443'),
  DATABASE_URL: z.string().default('postgresql://user:pass@localhost:5432/db'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_ACCESS_SECRET: z.string().default('accessdevsecret'),
  JWT_REFRESH_SECRET: z.string().default('refreshdevsecret'),
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.string().default('1025'),
  SMTP_USER: z.string().default('user'),
  SMTP_PASS: z.string().default('pass'),
  PAYSTACK_SECRET_KEY: z.string().default('psk'),
  PAYSTACK_PUBLIC_KEY: z.string().default('ppk'),
  STRIPE_SECRET: z.string().optional(),
  APP_URL: z.string().default('https://academy.uricreative.com'),
  API_URL: z.string().default('http://localhost:3000'),
  CORS_ORIGIN: z.string().optional(),
  SUPABASE_DB_URL: z.string().optional(),
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  throw new Error('Invalid environment configuration');
}

export const env = parsed.data;
