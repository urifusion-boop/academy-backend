import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './users.routes';
import assignmentRoutes from './assignments.routes';
import attendanceRoutes from './attendance.routes';
import cohortRoutes from './cohorts.routes';
import studentRoutes from './students.routes';
import contentRoutes from './content.routes';
import certificatesRoutes from './certificates.routes';
import curriculumRoutes from './curriculum.routes';
import filesRoutes from './files.routes';
import healthRoutes from './health.routes';
import paymentRoutes from './payments.routes';
import adminRoutes from './admin.routes';

const router = Router();

router.use('/admin', adminRoutes);
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/students', studentRoutes);
router.use('/assignments', assignmentRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/cohorts', cohortRoutes);
router.use('/content', contentRoutes);
router.use('/curriculum', curriculumRoutes);
router.use('/certificates', certificatesRoutes);
router.use('/files', filesRoutes);
router.use('/payments', paymentRoutes);

export default router;
