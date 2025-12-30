import { type RequestHandler } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { getPagination, listResponse } from '../lib/pagination';

const sessionsQuery = z.object({
  cohortId: z.string().optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
});

export const listSessions: RequestHandler = async (req, res) => {
  const parsed = sessionsQuery.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'ValidationError', issues: parsed.error.issues });
    return;
  }
  const { skip, take, page, pageSize } = getPagination(parsed.data);
  const where: { cohortId?: string } = {};

  if (res.locals.user.role === 'STUDENT') {
    const student = await prisma.studentProfile.findUnique({
      where: { userId: res.locals.user.id },
    });
    if (student && student.cohortId) {
      where.cohortId = student.cohortId;
    }
  } else if (parsed.data.cohortId) {
    where.cohortId = parsed.data.cohortId;
  }

  const [items, total] = await Promise.all([
    prisma.attendanceSession.findMany({ where, skip, take, orderBy: { date: 'desc' } }),
    prisma.attendanceSession.count({ where }),
  ]);
  res.json(listResponse(items, page, pageSize, total));
};

const createSessionSchema = z.object({
  date: z.string().datetime(),
  cohortId: z.string(),
  topic: z.string(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)'),
});

export const createSession: RequestHandler = async (req, res) => {
  const parsed = createSessionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'ValidationError', issues: parsed.error.issues });
    return;
  }

  // Helper to combine date string (ISO) with time string (HH:MM)
  const combineDateTime = (dateStr: string, timeStr: string) => {
    const d = new Date(dateStr);
    const [hours, minutes] = timeStr.split(':').map(Number);
    d.setUTCHours(hours, minutes, 0, 0);
    return d;
  };

  const s = await prisma.attendanceSession.create({
    data: {
      date: new Date(parsed.data.date),
      cohortId: parsed.data.cohortId,
      topic: parsed.data.topic,
      startTime: combineDateTime(parsed.data.date, parsed.data.startTime),
      endTime: combineDateTime(parsed.data.date, parsed.data.endTime),
    },
  });
  res.status(201).json(s);
};

const logSchema = z.object({
  studentId: z.string(),
  status: z.enum(['PRESENT', 'ABSENT', 'LATE']),
  notes: z.string().optional(),
});

export const createSessionLogs: RequestHandler = async (req, res) => {
  const data = req.body;
  const entries = Array.isArray(data) ? data : [data];
  const parsed = z.array(logSchema).safeParse(entries);
  if (!parsed.success) {
    res.status(400).json({ error: 'ValidationError', issues: parsed.error.issues });
    return;
  }
  const sessionId = req.params.id;

  // Verify that all studentIds exist before attempting to create logs
  const studentIds = parsed.data.map((e) => e.studentId);
  const existingStudents = await prisma.studentProfile.findMany({
    where: {
      id: { in: studentIds },
    },
    select: { id: true },
  });

  const existingStudentIds = new Set(existingStudents.map((s) => s.id));
  const missingStudentIds = studentIds.filter((id) => !existingStudentIds.has(id));

  if (missingStudentIds.length > 0) {
    res.status(400).json({
      error: 'Foreign Key Constraint Violation',
      message: `The following student IDs do not exist: ${missingStudentIds.join(', ')}`,
    });
    return;
  }

  const created = await prisma.attendanceLog.createMany({
    data: parsed.data.map((e) => ({
      sessionId,
      studentId: e.studentId,
      status: e.status,
      notes: e.notes,
    })),
  });

  const logs = await prisma.attendanceLog.findMany({
    where: {
      sessionId,
      studentId: { in: studentIds },
    },
  });

  res.status(201).json({
    message: `Successfully recorded attendance for ${created.count} student(s).`,
    logs,
  });
};

const logsQuery = z.object({
  studentId: z.string().optional(),
  sessionId: z.string().optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
});

export const listLogs: RequestHandler = async (req, res) => {
  const parsed = logsQuery.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'ValidationError', issues: parsed.error.issues });
    return;
  }
  const { skip, take, page, pageSize } = getPagination(parsed.data);

  const where: Record<string, unknown> = {};

  if (res.locals.user.role === 'STUDENT') {
    const student = await prisma.studentProfile.findUnique({
      where: { userId: res.locals.user.id },
    });
    if (!student) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    where.studentId = student.id;
  } else if (parsed.data.studentId) {
    where.studentId = parsed.data.studentId;
  }

  if (parsed.data.sessionId) where.sessionId = parsed.data.sessionId;

  const [items, total] = await Promise.all([
    prisma.attendanceLog.findMany({
      where,
      skip,
      take,
      orderBy: { sessionId: 'desc' },
      include: { session: { select: { date: true, topic: true, startTime: true, endTime: true } } },
    }),
    prisma.attendanceLog.count({ where }),
  ]);
  res.json(listResponse(items, page, pageSize, total));
};

const updateLogSchema = z.object({
  status: z.enum(['PRESENT', 'ABSENT', 'LATE']).optional(),
  notes: z.string().optional(),
});

export const updateLog: RequestHandler = async (req, res) => {
  const id = req.params.id;
  const parsed = updateLogSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'ValidationError', issues: parsed.error.issues });
    return;
  }
  const existing = await prisma.attendanceLog.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: 'NotFound' });
    return;
  }
  const updated = await prisma.attendanceLog.update({
    where: { id },
    data: { status: parsed.data.status, notes: parsed.data.notes },
  });
  res.json(updated);
};
