import { logger } from '../lib/logger';
import { ZodError } from 'zod';
import { type ErrorRequestHandler } from 'express';
import { AppError } from '../utils/errors';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res
      .status(400)
      .json({ error: { code: 'ValidationError', message: 'Invalid input', details: err.issues } });
    return;
  }
  if (err instanceof AppError) {
    logger.error({ err }, 'request_failed');
    res
      .status(err.status)
      .json({ error: { code: err.code, message: err.message, details: err.details } });
    return;
  }
  const status = (err && (err.status as number)) || 500;
  const message = (err && err.message) || 'Internal Server Error';
  logger.error({ err }, 'request_failed');
  res.status(status).json({ error: { code: 'ServerError', message } });
};
