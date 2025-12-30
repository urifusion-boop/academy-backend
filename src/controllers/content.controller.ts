import { type RequestHandler } from 'express';
import { prisma } from '../lib/prisma';
import { getPagination, listResponse } from '../lib/pagination';
import { createContentSchema, updateContentSchema, contentListQuery } from '../validators/content';

export const createContent: RequestHandler = async (req, res) => {
  const parsed = createContentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'ValidationError', issues: parsed.error.issues });
    return;
  }
  const asset = await prisma.contentAsset.create({
    data: {
      title: parsed.data.title,
      type: parsed.data.type,
      url: parsed.data.url,
      cohortId: parsed.data.cohortId,
    },
  });
  res.status(201).json(asset);
};

export const updateContent: RequestHandler = async (req, res) => {
  const parsed = updateContentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'ValidationError', issues: parsed.error.issues });
    return;
  }
  const id = req.params.id;
  const existing = await prisma.contentAsset.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: 'NotFound' });
    return;
  }
  const updated = await prisma.contentAsset.update({
    where: { id },
    data: {
      title: parsed.data.title,
      type: parsed.data.type,
      url: parsed.data.url,
      cohortId: parsed.data.cohortId,
    },
  });
  res.json(updated);
};

export const deleteContent: RequestHandler = async (req, res) => {
  const id = req.params.id;
  const existing = await prisma.contentAsset.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: 'NotFound' });
    return;
  }
  await prisma.contentAsset.delete({ where: { id } });
  res.status(200).json({ ok: true });
};

export const listCohortContent: RequestHandler = async (req, res) => {
  const parsed = contentListQuery.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'ValidationError', issues: parsed.error.issues });
    return;
  }
  const cohortId = req.params.id;

  if (res.locals.user.role === 'STUDENT') {
    const student = await prisma.studentProfile.findUnique({
      where: { userId: res.locals.user.id },
    });
    if (!student || student.cohortId !== cohortId) {
      res
        .status(403)
        .json({ error: 'Forbidden', message: 'You do not have access to this cohort content' });
      return;
    }
  }

  const { skip, take, page, pageSize } = getPagination(parsed.data);
  const [items, total] = await Promise.all([
    prisma.contentAsset.findMany({
      where: { cohortId },
      skip,
      take,
      orderBy: { publishedAt: 'desc' },
    }),
    prisma.contentAsset.count({ where: { cohortId } }),
  ]);
  res.json(listResponse(items, page, pageSize, total));
};
