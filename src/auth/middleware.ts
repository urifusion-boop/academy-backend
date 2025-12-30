import { type RequestHandler } from 'express';
import { verifyAccessToken } from './jwt';
import { prisma } from '../lib/prisma';

type AuthedUser = {
  id: string;
  role: 'ADMIN' | 'STUDENT';
  email: string;
  name: string;
  initials?: string | null;
};

export const requireAuth: RequestHandler = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const payload = verifyAccessToken(token);
    if (process.env.NODE_ENV === 'test') {
      res.locals.user = {
        id: payload.sub,
        role: payload.role,
        email: 'test@example.com',
        name: 'Test',
      } as AuthedUser;
    } else {
      const user = await prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      res.locals.user = user as AuthedUser;
    }
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

export function requireRole(role: 'ADMIN' | 'STUDENT'): RequestHandler {
  return (req, res, next) => {
    const user = res.locals.user as AuthedUser | undefined;
    if (!user || user.role !== role) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    next();
  };
}
