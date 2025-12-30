import { Router } from 'express';
import { requireAuth, requireRole } from '../auth/middleware';
import { validateBody } from '../middlewares/validate';
import {
  listCertificates,
  getCertificate,
  createCertificate,
  updateCertificate,
  revokeCertificate,
  deleteCertificate,
} from '../controllers/certificates.controller';
import { createCertificateSchema, updateCertificateSchema } from '../validators/certificates';

const router = Router();

router.use(requireAuth);
router.use(requireRole('ADMIN'));

router.get('/', listCertificates);
router.get('/:id', getCertificate);
router.post('/', validateBody(createCertificateSchema), createCertificate);
router.patch('/:id', validateBody(updateCertificateSchema), updateCertificate);
router.post('/:id/revoke', revokeCertificate);
router.delete('/:id', deleteCertificate);

export default router;
