import { Router } from 'express';
import { authLimiter } from '../config/rateLimit';
import { validateBody } from '../middlewares/validate';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
  resetRequestSchema,
  resetConfirmSchema,
} from '../validators/auth';
import {
  register,
  login,
  refresh,
  logout,
  requestPasswordReset,
  confirmPasswordReset,
} from '../controllers/auth.controller';

const router = Router();

router.post('/register', authLimiter, validateBody(registerSchema), register);
router.post('/login', authLimiter, validateBody(loginSchema), login);
router.post('/refresh', authLimiter, validateBody(refreshSchema), refresh);
router.post('/logout', authLimiter, validateBody(logoutSchema), logout);
router.post(
  '/password/reset/request',
  authLimiter,
  validateBody(resetRequestSchema),
  requestPasswordReset,
);
router.post(
  '/password/reset/confirm',
  authLimiter,
  validateBody(resetConfirmSchema),
  confirmPasswordReset,
);

export default router;
