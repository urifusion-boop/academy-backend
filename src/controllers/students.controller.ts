import { type RequestHandler } from 'express';
import bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { getPagination, listResponse } from '../lib/pagination';
import { asyncHandler } from '../utils/asyncHandler';
import { ValidationError, NotFoundError, ConflictError } from '../utils/errors';
import {
  createStudentSchema,
  updateStudentSchema,
  listStudentsQuerySchema,
} from '../validators/students';
import { toUserResponse } from '../utils/transformers';

export const listStudents: RequestHandler = asyncHandler(async (req, res) => {
  const parsed = listStudentsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues);
  }
  const { page, pageSize, skip, take } = getPagination(parsed.data);
  const { search, cohortId, status } = parsed.data;

  const where: Prisma.UserWhereInput = {
    role: 'STUDENT',
  };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (cohortId) {
    where.profile = { is: { cohortId } };
  }
  if (status) {
    // ACTIVE => has cohort; INACTIVE => no cohort
    where.profile = status === 'ACTIVE' ? { isNot: null } : { is: null };
    if (status === 'ACTIVE' && cohortId) {
      where.profile = { is: { cohortId } };
    }
  }

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take,
      include: {
        profile: {
          include: { cohort: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ]);

  const data = items.map((user) => ({
    ...toUserResponse(user),
    profile: user.profile,
  }));

  res.json(listResponse(data, page, pageSize, total));
});

export const exportStudents: RequestHandler = asyncHandler(async (req, res) => {
  const parsed = listStudentsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues);
  }
  const { search, cohortId, status } = parsed.data;
  const where: Prisma.UserWhereInput = { role: 'STUDENT' };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (cohortId) {
    where.profile = { is: { cohortId } };
  }
  if (status) {
    where.profile = status === 'ACTIVE' ? { isNot: null } : { is: null };
    if (status === 'ACTIVE' && cohortId) {
      where.profile = { is: { cohortId } };
    }
  }
  const items = await prisma.user.findMany({
    where,
    include: { profile: { include: { cohort: true } } },
    orderBy: { createdAt: 'desc' },
  });
  const rows = items.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    studentIdCode: u.profile?.studentIdCode ?? '',
    cohort: u.profile?.cohort?.name ?? '',
  }));
  const header = ['id', 'name', 'email', 'studentIdCode', 'cohort'] as const;
  const csvRows = rows.map((r) =>
    [r.id, r.name, r.email, r.studentIdCode, r.cohort]
      .map((v) => String(v).replace(/,/g, ' '))
      .join(','),
  );
  const csv = [header.join(','), ...csvRows].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="students.csv"');
  res.status(200).send(csv);
});

export const getStudent: RequestHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const student = await prisma.user.findUnique({
    where: { id, role: 'STUDENT' },
    include: {
      profile: {
        include: {
          cohort: true,
          submissions: { orderBy: { submittedAt: 'desc' }, include: { assignment: true } },
          grades: { orderBy: { gradedAt: 'desc' }, include: { assignment: true } },
          attendanceLogs: { orderBy: { session: { date: 'desc' } }, include: { session: true } },
        },
      },
    },
  });

  if (!student) {
    throw new NotFoundError('Student not found');
  }

  res.json({
    ...toUserResponse(student),
    profile: student.profile,
  });
});

export const createStudent: RequestHandler = asyncHandler(async (req, res) => {
  const parsed = createStudentSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues);
  }
  const { email, password, name, phoneNumber, cohortId } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ConflictError('Email already taken');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const studentIdCode = `STD-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0')}`;

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        passwordHash,
        name,
        phoneNumber,
        role: 'STUDENT',
      },
    });

    const profile = await tx.studentProfile.create({
      data: {
        userId: user.id,
        cohortId,
        studentIdCode,
      },
    });

    await tx.notificationPref.create({
      data: { userId: user.id, emailNews: false, emailAssignments: true, emailGrades: true },
    });

    return { user, profile };
  });

  res.status(201).json({
    ...toUserResponse(result.user),
    profile: result.profile,
  });
});

export const updateStudent: RequestHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const parsed = updateStudentSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues);
  }
  const { name, email, phoneNumber, cohortId } = parsed.data;

  const student = await prisma.user.findUnique({ where: { id, role: 'STUDENT' } });
  if (!student) {
    throw new NotFoundError('Student not found');
  }

  // If updating email, check uniqueness
  if (email && email !== student.email) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictError('Email already taken');
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: { id },
      data: { name, email, phoneNumber },
    });

    let updatedProfile = null;
    if (cohortId !== undefined) {
      updatedProfile = await tx.studentProfile.update({
        where: { userId: id },
        data: { cohortId },
      });
    } else {
      updatedProfile = await tx.studentProfile.findUnique({ where: { userId: id } });
    }

    return { user: updatedUser, profile: updatedProfile };
  });

  res.json({
    ...toUserResponse(result.user),
    profile: result.profile,
  });
});

export const deleteStudent: RequestHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const student = await prisma.user.findUnique({
    where: { id, role: 'STUDENT' },
    include: { profile: true },
  });
  if (!student) {
    throw new NotFoundError('Student not found');
  }

  await prisma.$transaction(async (tx) => {
    if (student.profile) {
      const studentId = student.profile.id;
      // Delete all related records first to satisfy foreign key constraints
      await tx.submission.deleteMany({ where: { studentId } });
      await tx.grade.deleteMany({ where: { studentId } });
      await tx.attendanceLog.deleteMany({ where: { studentId } });
      await tx.certificate.deleteMany({ where: { studentId } });
      await tx.payment.deleteMany({ where: { studentId } });
    }

    await tx.user.delete({ where: { id } });
  });

  res.status(200).json({ ok: true });
});
