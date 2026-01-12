import { Router } from 'express';
import { requireAuth, requireRole } from '../auth/middleware';
import { Role } from '@prisma/client';
import {
  createAssignment,
  listAssignments,
  getAssignment,
  createSubmission,
  listSubmissions,
  getSubmission,
  updateSubmission,
  gradeAssignment,
  listGrades,
  getSubmissionFile,
  gradeSubmission,
} from '../controllers/assignments.controller';
import { issueCapstoneCertificate } from '../controllers/assignments.controller';

const router = Router();

router.post('/', requireAuth, requireRole(Role.ADMIN), createAssignment);
router.get('/', requireAuth, requireRole([Role.STUDENT, Role.ADMIN]), listAssignments);

router.get('/grades', requireAuth, requireRole([Role.STUDENT, Role.ADMIN]), listGrades);

router.get('/submissions', requireAuth, requireRole([Role.STUDENT, Role.ADMIN]), listSubmissions);
router.get('/submissions/:id', requireAuth, requireRole([Role.STUDENT, Role.ADMIN]), getSubmission);
router.get(
  '/submissions/:id/file',
  requireAuth,
  requireRole([Role.STUDENT, Role.ADMIN]),
  getSubmissionFile,
);

router.get('/:id', requireAuth, requireRole([Role.STUDENT, Role.ADMIN]), getAssignment);

router.post('/:id/submissions', requireAuth, requireRole(Role.STUDENT), createSubmission);

router.patch('/submissions/:id', requireAuth, requireRole(Role.STUDENT), updateSubmission);
router.post('/submissions/:id/grade', requireAuth, requireRole(Role.ADMIN), gradeSubmission);

router.post('/:id/grade', requireAuth, requireRole(Role.ADMIN), gradeAssignment);

router.post('/:id/issue-certificate', requireAuth, requireRole(Role.ADMIN), issueCapstoneCertificate);

export default router;
