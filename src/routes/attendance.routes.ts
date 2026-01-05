import { Router } from 'express';
import { requireAuth, requireRole } from '../auth/middleware';
import {
  listSessions,
  createSession,
  createSessionLogs,
  listLogs,
  updateLog,
} from '../controllers/attendance.controller';
import { Role } from '@prisma/client';

const router = Router();

router.get('/sessions', requireAuth, requireRole([Role.STUDENT, Role.ADMIN]), listSessions);

router.post('/sessions', requireAuth, requireRole(Role.ADMIN), createSession);

router.post('/sessions/:id/logs', requireAuth, requireRole(Role.ADMIN), createSessionLogs);
router.get('/logs', requireAuth, requireRole([Role.STUDENT, Role.ADMIN]), listLogs);
router.patch('/logs/:id', requireAuth, requireRole(Role.ADMIN), updateLog);

export default router;
