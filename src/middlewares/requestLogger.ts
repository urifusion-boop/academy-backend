import pinoHttp from 'pino-http';
import { logger } from '../lib/logger';
import crypto from 'crypto';
import { type RequestHandler } from 'express';

export const requestLogger = pinoHttp({
  logger,
  // Use a custom success message
  customSuccessMessage: function (req, res) {
    if (res.statusCode >= 400) {
      return `${req.method} ${req.url} ${res.statusCode}`;
    }
    return `${req.method} ${req.url}`;
  },
  // Only log response time and status in the message
  customAttributeKeys: {
    req: 'req',
    res: 'res',
    err: 'err',
    responseTime: 'responseTime',
  },
  // Reduce the verbosity of the log object
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
  // Only log the completed request, not the incoming one
  autoLogging: {
    ignore: (req) => {
      if (req.url?.includes('/health') || req.url?.includes('/docs')) return true;
      return false;
    },
  },
});

export const attachRequestId: RequestHandler = (req, _res, next) => {
  const headerId = req.headers['x-request-id'];
  const id = typeof headerId === 'string' ? headerId : crypto.randomUUID();
  req.headers['x-request-id'] = id;
  next();
};
