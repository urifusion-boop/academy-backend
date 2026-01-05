import { Router } from 'express';
import { requireAuth, requireRole } from '../auth/middleware';
import { getCurriculum } from '../controllers/curriculum.controller';
import { Role } from '@prisma/client';

const router = Router();

router.get('/', requireAuth, requireRole([Role.STUDENT, Role.ADMIN]), getCurriculum);

export default router;
