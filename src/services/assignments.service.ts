import { prisma } from '../lib/prisma';
import { NotFoundError, ForbiddenError } from '../utils/errors';

type OrderBy = Record<string, 'asc' | 'desc'>;
export async function listAssignmentsService(
  where: Record<string, unknown>,
  skip: number,
  take: number,
  orderBy: OrderBy,
) {
  const [items, total] = await Promise.all([
    prisma.assignment.findMany({ where, skip, take, orderBy }),
    prisma.assignment.count({ where }),
  ]);
  return { items, total };
}

export async function getAssignmentService(id: string) {
  const item = await prisma.assignment.findUnique({ where: { id } });
  if (!item) throw new NotFoundError('Assignment not found');
  return item;
}

export async function createSubmissionService(
  assignmentId: string,
  userId: string,
  data: { contentURL?: string; fileRef?: string },
) {
  const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId } });
  if (!assignment) throw new NotFoundError('Assignment not found');
  const student = await prisma.studentProfile.findUnique({ where: { userId } });
  if (!student) throw new ForbiddenError('Not a student');
  const sub = await prisma.submission.create({
    data: {
      assignmentId,
      studentId: student.id,
      status: 'PENDING',
      contentURL: data.contentURL,
      fileRef: data.fileRef,
    },
  });
  return sub;
}

export async function getSubmissionService(id: string, userId: string, role: 'ADMIN' | 'STUDENT') {
  const sub = await prisma.submission.findUnique({ where: { id } });
  if (!sub) throw new NotFoundError('Submission not found');
  if (role !== 'ADMIN') {
    const student = await prisma.studentProfile.findUnique({ where: { userId } });
    if (!student || sub.studentId !== student.id) throw new ForbiddenError('Forbidden');
  }
  return sub;
}

export async function updateSubmissionService(
  id: string,
  userId: string,
  role: 'ADMIN' | 'STUDENT',
  data: { contentURL?: string; notes?: string },
) {
  const sub = await prisma.submission.findUnique({ where: { id } });
  if (!sub) throw new NotFoundError('Submission not found');
  if (sub.status !== 'PENDING') throw new ForbiddenError('Invalid state');
  if (role !== 'ADMIN') {
    const student = await prisma.studentProfile.findUnique({ where: { userId } });
    if (!student || sub.studentId !== student.id) throw new ForbiddenError('Forbidden');
  }
  const updated = await prisma.submission.update({
    where: { id },
    data: { contentURL: data.contentURL, notes: data.notes },
  });
  return updated;
}

export async function gradeAssignmentService(
  assignmentId: string,
  studentId: string,
  score: number,
  feedback?: string,
) {
  const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId } });
  if (!assignment) throw new NotFoundError('Assignment not found');
  let grade = await prisma.grade.findFirst({ where: { studentId, assignmentId } });
  if (grade) {
    grade = await prisma.grade.update({ where: { id: grade.id }, data: { score } });
  } else {
    grade = await prisma.grade.create({ data: { studentId, assignmentId, score } });
  }
  await prisma.submission.updateMany({
    where: { assignmentId, studentId },
    data: { status: 'REVIEWED', score, feedback },
  });
  return grade;
}

export async function listGradesService(studentId: string, skip: number, take: number) {
  const where = { studentId };
  const [items, total] = await Promise.all([
    prisma.grade.findMany({ where, skip, take, orderBy: { gradedAt: 'desc' } }),
    prisma.grade.count({ where }),
  ]);
  return { items, total };
}
