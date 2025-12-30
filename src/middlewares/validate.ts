import { type RequestHandler } from 'express';
import { ZodSchema } from 'zod';
import { ValidationError } from '../utils/errors';

type ReqWithValidated = { validated?: { body?: unknown; query?: unknown } };
export function validateBody<T>(schema: ZodSchema<T>): RequestHandler {
  return (req, _res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      next(new ValidationError(parsed.error.issues));
      return;
    }
    const r = req as unknown as ReqWithValidated;
    r.validated = { ...(r.validated ?? {}), body: parsed.data };
    next();
  };
}

export function validateQuery<T>(schema: ZodSchema<T>): RequestHandler {
  return (req, _res, next) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      next(new ValidationError(parsed.error.issues));
      return;
    }
    const r = req as unknown as ReqWithValidated;
    r.validated = { ...(r.validated ?? {}), query: parsed.data };
    next();
  };
}
