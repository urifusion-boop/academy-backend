import { Router } from 'express';
import { requireAuth, requireRole } from '../auth/middleware';
import { validateBody } from '../middlewares/validate';
import { createContentSchema, updateContentSchema } from '../validators/content';
import { createContent, updateContent, deleteContent } from '../controllers/content.controller';

const router = Router();

router.post('/', requireAuth, requireRole('ADMIN'), validateBody(createContentSchema), createContent);
router.patch('/:id', requireAuth, requireRole('ADMIN'), validateBody(updateContentSchema), updateContent);
router.delete('/:id', requireAuth, requireRole('ADMIN'), deleteContent);

export default router;
