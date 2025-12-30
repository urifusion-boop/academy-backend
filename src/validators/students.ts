import { z } from 'zod';

export const createStudentSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  phoneNumber: z.string().optional(),
  cohortId: z.string().uuid().optional(),
});

export const updateStudentSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).optional(),
  phoneNumber: z.string().optional(),
  cohortId: z.string().uuid().optional(),
});

export const listStudentsQuerySchema = z.object({
  page: z.string().optional(),
  pageSize: z.string().optional(),
  search: z.string().optional(),
  cohortId: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});
