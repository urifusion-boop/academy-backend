import { z } from 'zod';

export const createAssignmentSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  dueAt: z.string().datetime(),
  maxScore: z.number().int().positive(),
  cohortId: z.string().optional(),
});

export const listQuerySchema = z.object({
  cohortId: z.string().optional(),
  q: z.string().optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
  sortBy: z.enum(['dueAt', 'title']).optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
});

export const submissionCreateSchema = z.object({
  contentURL: z.string().url().optional(),
  fileRef: z.string().optional(),
  cohortId: z.string().optional(),
});

export const submissionUpdateSchema = z.object({
  contentURL: z.string().url().optional(),
  notes: z.string().max(500).optional(),
});

export const gradeSchema = z.object({
  studentId: z.string(),
  score: z.number().min(0),
  feedback: z.string().optional(),
});

export const gradeSubmissionSchema = z.object({
  score: z.number().min(0),
  feedback: z.string().optional(),
});

export const gradesQuerySchema = z.object({
  studentId: z.string(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
});
