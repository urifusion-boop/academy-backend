import { Router } from 'express';
import { requireAuth } from '../auth/middleware';
import { validateBody } from '../middlewares/validate';
import { uploadFileSchema } from '../validators/files';
import { uploadFile } from '../controllers/files.controller';

const router = Router();

router.post('/upload', requireAuth, validateBody(uploadFileSchema), uploadFile);

export default router;

