import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';

const supabaseUrl = process.env.SUPABASE_DB_URL || env.SUPABASE_DB_URL;
if (supabaseUrl && supabaseUrl.length > 0) {
  process.env.DATABASE_URL = supabaseUrl;
} else if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = env.DATABASE_URL;
}

// Ensure connection pool settings are robust
if (process.env.DATABASE_URL) {
  const url = new URL(process.env.DATABASE_URL);
  // Increase pool timeout to 30s (default is 10s) to handle transient delays
  if (!url.searchParams.has('pool_timeout')) {
    url.searchParams.set('pool_timeout', '30');
  }
  // Explicitly set connection limit if not set, to avoid default calculation which might be too high/low
  if (!url.searchParams.has('connection_limit')) {
    // 20 is a reasonable default for Supabase transaction pooler in this context
    url.searchParams.set('connection_limit', '20');
  }
  process.env.DATABASE_URL = url.toString();
}

export const prisma = new PrismaClient({
  log: ['warn', 'error'],
});
