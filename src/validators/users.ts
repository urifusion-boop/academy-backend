import { z } from 'zod';

export const updateMeSchema = z.object({
  name: z.string().optional(),
  initials: z.string().optional(),
});

export const updatePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8),
});

export const updateNotifSchema = z.object({
  emailNews: z.boolean().optional(),
  emailAssignments: z.boolean().optional(),
  emailGrades: z.boolean().optional(),
});
