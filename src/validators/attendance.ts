import { z } from 'zod'

export const sessionsQuery = z.object({
  cohortId: z.string().optional(),
  page: z.string().optional(),
  pageSize: z.string().optional()
})

export const createSessionSchema = z.object({
  date: z.string(),
  cohortId: z.string(),
  topic: z.string(),
  startTime: z.string(),
  endTime: z.string()
})

export const logSchema = z.object({
  studentId: z.string(),
  status: z.enum(['PRESENT', 'ABSENT', 'LATE']),
  notes: z.string().optional()
})

export const logsQuery = z.object({
  studentId: z.string(),
  page: z.string().optional(),
  pageSize: z.string().optional()
})
