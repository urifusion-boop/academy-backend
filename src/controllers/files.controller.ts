import { type RequestHandler } from 'express';
import multer from 'multer';
import { uploadSubmissionFile } from '../services/storage.service';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
];

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed. Allowed types: PDF, ZIP, DOC, DOCX, JPG, PNG`));
    }
  },
});

export const uploadFile: RequestHandler = async (req, res) => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: 'No file provided' });
    return;
  }

  try {
    const url = await uploadSubmissionFile(file.buffer, file.originalname, file.mimetype);
    res.status(201).json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    res.status(500).json({ error: message });
  }
};
