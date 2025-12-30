import { type RequestHandler } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { getPagination, listResponse } from '../lib/pagination';
import { asyncHandler } from '../utils/asyncHandler';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors';
import { createCohortSchema } from '../validators/cohorts';
import { updateCohortSchema } from '../validators/cohorts';

const listCohortsQuery = z.object({
  q: z.string().optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
  status: z.enum(['PLANNED', 'ACTIVE', 'COMPLETED']).optional(),
  sortBy: z.enum(['startDate', 'endDate', 'name']).optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
});

export const createCohort: RequestHandler = asyncHandler(async (req, res) => {
  const parsed = createCohortSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues);
  }

  const { name, startDate, endDate, status } = parsed.data;

  const existing = await prisma.cohort.findUnique({ where: { name } });
  if (existing) {
    throw new ConflictError('Cohort with this name already exists');
  }

  const cohort = await prisma.cohort.create({
    data: {
      name,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status: status || 'PLANNED',
    },
  });

  res.status(201).json(cohort);
});

export const listCohorts: RequestHandler = asyncHandler(async (req, res) => {
  const parsed = listCohortsQuery.safeParse(req.query);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues);
  }

  const { q, status, sortBy = 'startDate', sortDir = 'desc' } = parsed.data;
  const { skip, take, page, pageSize } = getPagination(parsed.data);

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (q) where.name = { contains: q, mode: 'insensitive' };

  const [items, total] = await Promise.all([
    prisma.cohort.findMany({
      where,
      skip,
      take,
      orderBy: { [sortBy]: sortDir },
    }),
    prisma.cohort.count({ where }),
  ]);

  res.json(listResponse(items, page, pageSize, total));
});

export const getCohort: RequestHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const cohort = await prisma.cohort.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          students: true,
          sessions: true,
          assignments: true,
        },
      },
    },
  });

  if (!cohort) {
    throw new NotFoundError('Cohort not found');
  }

  res.json(cohort);
});

export const updateCohort: RequestHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const parsed = updateCohortSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues);
  }
  const existing = await prisma.cohort.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError('Cohort not found');
  }
  const updated = await prisma.cohort.update({
    where: { id },
    data: {
      name: parsed.data.name,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : undefined,
      status: parsed.data.status,
    },
  });
  res.json(updated);
});
