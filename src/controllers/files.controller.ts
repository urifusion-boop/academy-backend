import { type RequestHandler } from 'express';
import { getPresignedPutUrl, generateObjectName, getPublicUrl } from '../services/storage.service';

export const uploadFile: RequestHandler = async (req, res) => {
  const body = (
    req as unknown as { validated?: { body?: { fileName: string; contentType?: string } } }
  ).validated?.body;
  const fileName = body?.fileName;
  if (!fileName) {
    res.status(400).json({ error: { code: 'ValidationError', message: 'fileName is required' } });
    return;
  }
  const objectName = await generateObjectName(fileName);
  const uploadURL = await getPresignedPutUrl(objectName, 600);
  const publicURL = await getPublicUrl(objectName);
  res.status(201).json({ fileRef: objectName, url: uploadURL || publicURL });
};
