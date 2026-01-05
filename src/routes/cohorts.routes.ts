import { Router } from 'express';
import { requireAuth, requireRole } from '../auth/middleware';
import {
  listCohorts,
  getCohort,
  createCohort,
  updateCohort,
} from '../controllers/cohorts.controller';
import { listCohortContent } from '../controllers/content.controller';
import { Role } from '@prisma/client';

const router = Router();

router.post('/', requireAuth, requireRole(Role.ADMIN), createCohort);
router.get('/', requireAuth, requireRole([Role.STUDENT, Role.ADMIN]), listCohorts);
router.get('/:id', requireAuth, requireRole([Role.STUDENT, Role.ADMIN]), getCohort);
router.patch('/:id', requireAuth, requireRole(Role.ADMIN), updateCohort);
router.get('/:id/content', requireAuth, requireRole([Role.STUDENT, Role.ADMIN]), listCohortContent);

export default router;
