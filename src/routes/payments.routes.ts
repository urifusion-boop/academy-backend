import { Router } from 'express';
import { requireAuth, requireRole } from '../auth/middleware';
import {
  initiatePayment,
  paystackWebhook,
  markPaid,
  verifyPayment,
} from '../controllers/payments.controller';
import { Role } from '@prisma/client';

const router = Router();

router.post('/initialize', requireAuth, initiatePayment);
router.post('/webhook', paystackWebhook);
router.post('/mark-paid', requireAuth, requireRole(Role.ADMIN), markPaid);
router.post('/verify', requireAuth, verifyPayment);

export default router;
