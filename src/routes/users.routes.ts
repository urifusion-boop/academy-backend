import { Router } from 'express';
import { requireAuth } from '../auth/middleware';
import { validateBody } from '../middlewares/validate';
import { updateMeSchema, updatePasswordSchema, updateNotifSchema } from '../validators/users';
import {
  getMe,
  updateMe,
  updatePassword,
  updateNotifications,
} from '../controllers/users.controller';

const router = Router();

router.get('/me', requireAuth, getMe);

router.patch('/me', requireAuth, validateBody(updateMeSchema), updateMe);

router.patch('/me/password', requireAuth, validateBody(updatePasswordSchema), updatePassword);

router.patch(
  '/me/notifications',
  requireAuth,
  validateBody(updateNotifSchema),
  updateNotifications,
);

export default router;
