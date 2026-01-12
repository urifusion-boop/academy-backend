import { type RequestHandler } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { getPagination, listResponse } from '../lib/pagination';
import {
  createAssignmentSchema,
  gradeSubmissionSchema,
  issueCertificateSchema,
} from '../validators/assignments';
import crypto from 'crypto';

const listQuerySchema = z.object({
  cohortId: z.string().optional(),
  q: z.string().optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
  sortBy: z.enum(['dueAt', 'title']).optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
});

export const createAssignment: RequestHandler = async (req, res) => {
  const parsed = createAssignmentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'ValidationError', issues: parsed.error.issues });
    return;
  }
  if (parsed.data.cohortId) {
    const cohort = await prisma.cohort.findUnique({
      where: { id: parsed.data.cohortId },
    });
    if (!cohort) {
      res
        .status(400)
        .json({ error: 'ValidationError', message: 'Invalid cohortId: Cohort not found' });
      return;
    }
  }
  const assignment = await prisma.assignment.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      dueAt: new Date(parsed.data.dueAt),
      maxScore: parsed.data.maxScore,
      cohortId: parsed.data.cohortId,
    },
  });
  res.status(201).json(assignment);
};

export const listAssignments: RequestHandler = async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'ValidationError', issues: parsed.error.issues });
    return;
  }
  const { cohortId, q, sortBy = 'dueAt', sortDir = 'asc' } = parsed.data;
  const { skip, take, page, pageSize } = getPagination(parsed.data);
  const where: Record<string, unknown> = {};

  if (res.locals.user.role === 'STUDENT') {
    const student = await prisma.studentProfile.findUnique({
      where: { userId: res.locals.user.id },
    });
    if (!student) {
      // If student profile is missing, return empty list instead of leaking all assignments
      res.json(listResponse([], page, pageSize, 0));
      return;
    }
    where.cohortId = student.cohortId;
  } else if (cohortId) {
    where.cohortId = cohortId;
  }

  if (q) where.title = { contains: q, mode: 'insensitive' };
  const [items, total] = await Promise.all([
    prisma.assignment.findMany({ where, skip, take, orderBy: { [sortBy]: sortDir } }),
    prisma.assignment.count({ where }),
  ]);
  res.json(listResponse(items, page, pageSize, total));
};

const submissionsQuerySchema = z.object({
  assignmentId: z.string().optional(),
  studentId: z.string().optional(),
  cohortId: z.string().optional(),
  status: z.enum(['PENDING', 'REVIEWED']).optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
});

export const listSubmissions: RequestHandler = async (req, res) => {
  const parsed = submissionsQuerySchema.safeParse(req.query);
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
  } else {
    // Admin
    if (parsed.data.studentId) where.studentId = parsed.data.studentId;
    if (parsed.data.cohortId) {
      // Filter submissions by student's cohort
      where.student = { cohortId: parsed.data.cohortId };
    }
  }

  if (parsed.data.assignmentId) where.assignmentId = parsed.data.assignmentId;
  if (parsed.data.status) where.status = parsed.data.status;

  const [items, total] = await Promise.all([
    prisma.submission.findMany({
      where,
      skip,
      take,
      orderBy: { submittedAt: 'desc' },
      include: {
        assignment: { select: { title: true, maxScore: true } },
        student: {
          include: {
            user: { select: { id: true, name: true, email: true, initials: true } },
          },
        },
      },
    }),
    prisma.submission.count({ where }),
  ]);
  res.json(listResponse(items, page, pageSize, total));
};

export const getAssignment: RequestHandler = async (req, res) => {
  const id = req.params.id;
  const item = await prisma.assignment.findUnique({ where: { id } });
  if (!item) {
    res.status(404).json({ error: 'NotFound' });
    return;
  }
  res.json(item);
};

const submissionCreateSchema = z.object({
  contentURL: z.string().url(),
  cohortId: z.string().optional(),
});

export const createSubmission: RequestHandler = async (req, res) => {
  const parsed = submissionCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'ValidationError', issues: parsed.error.issues });
    return;
  }
  const assignmentId = req.params.id;
  const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId } });
  if (!assignment) {
    res.status(404).json({ error: 'NotFound' });
    return;
  }
  const student = await prisma.studentProfile.findUnique({ where: { userId: res.locals.user.id } });
  if (!student) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  // Verify cohort match if cohortId provided
  if (parsed.data.cohortId && student.cohortId && parsed.data.cohortId !== student.cohortId) {
    res.status(400).json({ error: 'ValidationError', message: 'Cohort mismatch' });
    return;
  }

  const sub = await prisma.submission.create({
    data: {
      assignmentId,
      studentId: student.id,
      status: 'PENDING',
      contentURL: parsed.data.contentURL,
    },
  });
  res.status(201).json(sub);
};

export const getSubmission: RequestHandler = async (req, res) => {
  const id = req.params.id;
  const sub = await prisma.submission.findUnique({ where: { id } });
  if (!sub) {
    res.status(404).json({ error: 'NotFound' });
    return;
  }
  const user = res.locals.user;
  if (user.role !== 'ADMIN') {
    const student = await prisma.studentProfile.findUnique({ where: { userId: user.id } });
    if (!student || sub.studentId !== student.id) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
  }
  res.json(sub);
};

const submissionUpdateSchema = z.object({
  contentURL: z.string().url().optional(),
  notes: z.string().max(500).optional(),
  status: z.enum(['PENDING', 'REVIEWED']).optional(),
});

export const updateSubmission: RequestHandler = async (req, res) => {
  const parsed = submissionUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'ValidationError', issues: parsed.error.issues });
    return;
  }
  const id = req.params.id;
  const sub = await prisma.submission.findUnique({ where: { id } });
  if (!sub) {
    res.status(404).json({ error: 'NotFound' });
    return;
  }
  const user = res.locals.user;
  if (user.role !== 'ADMIN') {
    const student = await prisma.studentProfile.findUnique({ where: { userId: user.id } });
    if (!student || sub.studentId !== student.id) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
  }
  const updated = await prisma.submission.update({
    where: { id },
    data: {
      contentURL: parsed.data.contentURL,
      notes: parsed.data.notes,
      status: parsed.data.status,
    },
  });
  res.json(updated);
};

const gradeSchema = z.object({
  studentId: z.string(),
  score: z.number().min(0),
  feedback: z.string().optional(),
});

export const gradeAssignment: RequestHandler = async (req, res) => {
  const parsed = gradeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'ValidationError', issues: parsed.error.issues });
    return;
  }
  const assignmentId = req.params.id;
  const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId } });
  if (!assignment) {
    res.status(404).json({ error: 'NotFound' });
    return;
  }
  let grade = await prisma.grade.findFirst({
    where: { studentId: parsed.data.studentId, assignmentId },
  });
  if (grade) {
    grade = await prisma.grade.update({
      where: { id: grade.id },
      data: { score: parsed.data.score },
    });
  } else {
    grade = await prisma.grade.create({
      data: { studentId: parsed.data.studentId, assignmentId, score: parsed.data.score },
    });
  }
  await prisma.submission.updateMany({
    where: { assignmentId, studentId: parsed.data.studentId },
    data: { status: 'REVIEWED', score: parsed.data.score, feedback: parsed.data.feedback },
  });
  const submission = await prisma.submission.findFirst({
    where: { assignmentId, studentId: parsed.data.studentId },
  });
  res.status(201).json({ grade, submission });
};

const gradesQuerySchema = z.object({
  studentId: z.string().optional(),
  assignmentId: z.string().optional(),
  cohortId: z.string().optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
});

export const listGrades: RequestHandler = async (req, res) => {
  const parsed = gradesQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'ValidationError', issues: parsed.error.issues });
    return;
  }
  const { skip, take, page, pageSize } = getPagination(parsed.data);
  const where: Record<string, unknown> = {};
  if (parsed.data.studentId) where.studentId = parsed.data.studentId;
  if (parsed.data.assignmentId) where.assignmentId = parsed.data.assignmentId;

  const [items, total] = await Promise.all([
    prisma.grade.findMany({
      where: parsed.data.cohortId
        ? { ...where, student: { is: { cohortId: parsed.data.cohortId } } }
        : where,
      skip,
      take,
      orderBy: { gradedAt: 'desc' },
    }),
    prisma.grade.count({
      where: parsed.data.cohortId
        ? { ...where, student: { is: { cohortId: parsed.data.cohortId } } }
        : where,
    }),
  ]);
  res.json(listResponse(items, page, pageSize, total));
};

export const getSubmissionFile: RequestHandler = async (req, res) => {
  const id = req.params.id;
  const sub = await prisma.submission.findUnique({ where: { id } });
  if (!sub) {
    res.status(404).json({ error: 'NotFound' });
    return;
  }
  if (sub.contentURL) {
    res.json({ url: sub.contentURL });
    return;
  }
  res.status(404).json({ error: 'NotFound', message: 'No URL available for this submission' });
};

export const gradeSubmission: RequestHandler = async (req, res) => {
  const parsed = gradeSubmissionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'ValidationError', issues: parsed.error.issues });
    return;
  }
  const id = req.params.id; // submission ID
  const submission = await prisma.submission.findUnique({ where: { id } });
  if (!submission) {
    res.status(404).json({ error: 'NotFound', message: 'Submission not found' });
    return;
  }

  // Update specific submission
  const updatedSubmission = await prisma.submission.update({
    where: { id },
    data: {
      status: 'REVIEWED',
      score: parsed.data.score,
      feedback: parsed.data.feedback,
    },
  });

  // Sync with Grade model (Upsert)
  const { studentId, assignmentId } = submission;
  let grade = await prisma.grade.findFirst({
    where: { studentId, assignmentId },
  });

  if (grade) {
    grade = await prisma.grade.update({
      where: { id: grade.id },
      data: { score: parsed.data.score },
    });
  } else {
    grade = await prisma.grade.create({
      data: { studentId, assignmentId, score: parsed.data.score },
    });
  }

  res.json({ submission: updatedSubmission, grade });
};

export const issueCapstoneCertificate: RequestHandler = async (req, res) => {
  const assignmentId = req.params.id;
  const parsed = issueCertificateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'ValidationError', issues: parsed.error.issues });
    return;
  }
  const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId } });
  if (!assignment) {
    res.status(404).json({ error: 'NotFound', message: 'Assignment not found' });
    return;
  }
  const student = await prisma.studentProfile.findUnique({ where: { id: parsed.data.studentId } });
  if (!student) {
    res.status(404).json({ error: 'NotFound', message: 'Student not found' });
    return;
  }
  const grade = await prisma.grade.findFirst({
    where: { assignmentId, studentId: student.id },
  });
  if (!grade) {
    res
      .status(400)
      .json({ error: 'ValidationError', message: 'Grade is required before issuing certificate' });
    return;
  }
  const serial =
    parsed.data.serialNumber || crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase();
  const certificate = await prisma.certificate.create({
    data: {
      studentId: student.id,
      fileURL: parsed.data.fileURL,
      serialNumber: serial,
      issuedAt: parsed.data.issuedAt ? new Date(parsed.data.issuedAt) : new Date(),
      status: 'GENERATED',
    },
  });
  res.status(201).json(certificate);
};
