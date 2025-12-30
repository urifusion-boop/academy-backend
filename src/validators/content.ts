import { z } from 'zod';

export const createContentSchema = z.object({
  title: z.string().min(1),
  type: z.enum(['VIDEO', 'DOC', 'LINK']),
  url: z.string().min(1),
  cohortId: z.string().optional(),
});

export const updateContentSchema = z.object({
  title: z.string().min(1).optional(),
  type: z.enum(['VIDEO', 'DOC', 'LINK']).optional(),
  url: z.string().min(1).optional(),
  cohortId: z.string().optional(),
});

export const contentListQuery = z.object({
  page: z.string().optional(),
  pageSize: z.string().optional(),
});
