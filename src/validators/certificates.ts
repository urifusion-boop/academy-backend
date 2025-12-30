import { z } from 'zod';

export const listCertificatesQuery = z.object({
  studentId: z.string().optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
  status: z.enum(['GENERATED', 'REVOKED']).optional(),
});

export const createCertificateSchema = z.object({
  studentId: z.string().optional(),
  fileURL: z.string(),
  serialNumber: z.string().optional(),
  issuedAt: z.string().datetime().optional(),
  status: z.enum(['GENERATED', 'REVOKED']).optional(),
});

export const updateCertificateSchema = z.object({
  fileURL: z.string().optional(),
  issuedAt: z.string().datetime().optional(),
  status: z.enum(['GENERATED', 'REVOKED']).optional(),
});
