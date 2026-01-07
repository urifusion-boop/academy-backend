import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  phoneNumber: z.string().optional(),
  role: z.enum(['APPLICANT', 'STUDENT', 'ADMIN']).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const refreshSchema = z.object({
  refreshToken: z.string(),
});

export const logoutSchema = z.object({
  refreshToken: z.string(),
});

export const resetRequestSchema = z.object({ email: z.string().email() });
export const resetConfirmSchema = z.object({ token: z.string(), newPassword: z.string().min(8) });
