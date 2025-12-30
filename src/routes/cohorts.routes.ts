import { Router } from 'express';
import { requireAuth, requireRole } from '../auth/middleware';
import {
  listCohorts,
  getCohort,
  createCohort,
  updateCohort,
} from '../controllers/cohorts.controller';
import { listCohortContent } from '../controllers/content.controller';

const router = Router();

router.post('/', requireAuth, requireRole('ADMIN'), createCohort);
router.get('/', requireAuth, listCohorts);
router.get('/:id', requireAuth, getCohort);
router.patch('/:id', requireAuth, requireRole('ADMIN'), updateCohort);
router.get('/:id/content', requireAuth, listCohortContent);

export default router;
