import { Router } from 'express';
import { requireAuth, requireRole } from '../auth/middleware';
import {
  initiatePayment,
  initializePublicPayment,
  squadWebhook,
  markPaid,
  verifyPayment,
} from '../controllers/payments.controller';
import { Role } from '@prisma/client';

const router = Router();

router.post('/initialize-public', initializePublicPayment);
router.post('/initialize', requireAuth, initiatePayment);
router.post('/webhook', squadWebhook);
router.post('/mark-paid', requireAuth, requireRole(Role.ADMIN), markPaid);
router.post('/verify', verifyPayment);

export default router;
