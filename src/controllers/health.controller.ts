import { type RequestHandler } from 'express';
import os from 'os';
import { asyncHandler } from '../utils/asyncHandler';

export const health: RequestHandler = asyncHandler(async (_req, res) => {
  res.json({
    ok: true,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    pid: process.pid,
    hostname: os.hostname(),
  });
});
