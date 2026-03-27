import { Router } from 'express';
import { requireAuth, requireRole } from '../auth/middleware';
import { Role } from '@prisma/client';
import { upload, uploadFile } from '../controllers/files.controller';

const router = Router();

router.post(
  '/upload',
  requireAuth,
  requireRole([Role.STUDENT, Role.ADMIN]),
  upload.single('file'),
  uploadFile,
);

export default router;
