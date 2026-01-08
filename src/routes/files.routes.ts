import { Router } from 'express';
import { requireAuth } from '../auth/middleware';
import { validateBody } from '../middlewares/validate';
import { uploadFileSchema } from '../validators/files';
import { uploadFile, getFile } from '../controllers/files.controller';

const router = Router();

router.post('/upload', requireAuth, validateBody(uploadFileSchema), uploadFile);
router.get('/:fileRef(*)', requireAuth, getFile);

export default router;

