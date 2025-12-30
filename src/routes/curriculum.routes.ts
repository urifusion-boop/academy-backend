import { Router } from 'express';
import { requireAuth } from '../auth/middleware';
import { getCurriculum } from '../controllers/curriculum.controller';

const router = Router();

router.get('/', requireAuth, getCurriculum);

export default router;
