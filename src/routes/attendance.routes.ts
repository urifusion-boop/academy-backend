import { Router } from 'express';
import { requireAuth, requireRole } from '../auth/middleware';
import {
  listSessions,
  createSession,
  createSessionLogs,
  listLogs,
  updateLog,
} from '../controllers/attendance.controller';

const router = Router();

router.get('/sessions', requireAuth, listSessions);

router.post('/sessions', requireAuth, requireRole('ADMIN'), createSession);

router.post('/sessions/:id/logs', requireAuth, requireRole('ADMIN'), createSessionLogs);
router.get('/logs', requireAuth, listLogs);
router.patch('/logs/:id', requireAuth, requireRole('ADMIN'), updateLog);

export default router;
