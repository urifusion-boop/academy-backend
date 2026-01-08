import { Router } from 'express';
import { requireAuth, requireRole } from '../auth/middleware';
import { Role } from '@prisma/client';
import { listSubmissions } from '../controllers/assignments.controller';

const router = Router();

router.get('/submissions', requireAuth, requireRole(Role.ADMIN), listSubmissions);

export default router;
