import { Router } from 'express';
import { requireAuth, requireRole } from '../auth/middleware';
import {
  getCurriculum,
  seedCurriculum,
  createCurriculumItem,
  updateCurriculumItem,
  deleteCurriculumItem,
} from '../controllers/curriculum.controller';
import { listCurriculumContent } from '../controllers/content.controller';
import { Role } from '@prisma/client';

const router = Router();

router.get('/', requireAuth, requireRole([Role.STUDENT, Role.ADMIN]), getCurriculum);
router.post('/', requireAuth, requireRole(Role.ADMIN), createCurriculumItem);
router.patch('/:id', requireAuth, requireRole(Role.ADMIN), updateCurriculumItem);
router.delete('/:id', requireAuth, requireRole(Role.ADMIN), deleteCurriculumItem);
router.post('/seed', requireAuth, requireRole(Role.ADMIN), seedCurriculum);
router.get(
  '/:id/content',
  requireAuth,
  requireRole([Role.STUDENT, Role.ADMIN]),
  listCurriculumContent,
);

export default router;
