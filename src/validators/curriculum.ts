import { z } from 'zod';

export const createCurriculumItemSchema = z.object({
  week: z.number().int().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  durationMinutes: z.number().int().min(1),
  orderIndex: z.number().int().min(0),
  topics: z.array(z.string()).default([]),
  icon: z.string().optional(),
});

export const updateCurriculumItemSchema = z.object({
  week: z.number().int().min(1).optional(),
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  durationMinutes: z.number().int().min(1).optional(),
  orderIndex: z.number().int().min(0).optional(),
  topics: z.array(z.string()).optional(),
  icon: z.string().optional(),
});
