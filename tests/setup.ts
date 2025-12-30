process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.PORT = process.env.PORT || '3001';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/db';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'testaccess';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'testrefresh';
process.env.SMTP_HOST = process.env.SMTP_HOST || 'localhost';
process.env.SMTP_PORT = process.env.SMTP_PORT || '1025';
process.env.SMTP_USER = process.env.SMTP_USER || 'user';
process.env.SMTP_PASS = process.env.SMTP_PASS || 'pass';
process.env.PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || 'psk';
process.env.PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY || 'ppk';
process.env.STORAGE_BUCKET = process.env.STORAGE_BUCKET || 'bucket';
process.env.STORAGE_ENDPOINT = process.env.STORAGE_ENDPOINT || 'http://localhost:9000';
process.env.STORAGE_ACCESS_KEY = process.env.STORAGE_ACCESS_KEY || 'key';
process.env.STORAGE_SECRET_KEY = process.env.STORAGE_SECRET_KEY || 'secret';
process.env.APP_URL = process.env.APP_URL || 'http://localhost:5174';
process.env.API_URL = process.env.API_URL || 'http://localhost:3000';
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5174';

import app from '../src/app';
import request from 'supertest';

export const api = () => request(app);
