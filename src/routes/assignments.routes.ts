import { Router } from 'express';
import { requireAuth, requireRole } from '../auth/middleware';
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

const router = Router();

router.post('/', requireAuth, requireRole('ADMIN'), createAssignment);
router.get('/', requireAuth, listAssignments);

router.get('/grades', requireAuth, listGrades);

router.get('/submissions', requireAuth, listSubmissions);
router.get('/submissions/:id', requireAuth, getSubmission);
router.get('/submissions/:id/file', requireAuth, getSubmissionFile);

router.get('/:id', requireAuth, getAssignment);

router.post('/:id/submissions', requireAuth, createSubmission);

router.patch('/submissions/:id', requireAuth, updateSubmission);
router.post('/submissions/:id/grade', requireAuth, requireRole('ADMIN'), gradeSubmission);

router.post('/:id/grade', requireAuth, requireRole('ADMIN'), gradeAssignment);

export default router;
