import { Router } from 'express';
import { requireAuth, requireRole } from '../auth/middleware';
import {
  listStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
  exportStudents,
} from '../controllers/students.controller';
import {
  listStudentCertificates,
  createStudentCertificate,
} from '../controllers/certificates.controller';
import { validateBody } from '../middlewares/validate';
import { createCertificateSchema } from '../validators/certificates';

const router = Router();

router.use(requireAuth);
router.use(requireRole('ADMIN'));

router.get('/', listStudents);
router.get('/export', exportStudents);
router.get('/:id', getStudent);
router.post('/', createStudent);
router.patch('/:id', updateStudent);
router.delete('/:id', deleteStudent);
router.get('/:id/certificates', listStudentCertificates);
router.post('/:id/certificates', validateBody(createCertificateSchema), createStudentCertificate);

export default router;
