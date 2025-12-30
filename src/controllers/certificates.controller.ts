import { type RequestHandler } from 'express';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { getPagination, listResponse } from '../lib/pagination';
import {
  listCertificatesQuery,
  createCertificateSchema,
  updateCertificateSchema,
} from '../validators/certificates';

export const listCertificates: RequestHandler = async (req, res) => {
  const parsed = listCertificatesQuery.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'ValidationError', details: parsed.error.issues } });
    return;
  }
  const { skip, take, page, pageSize } = getPagination(parsed.data);
  const where: Record<string, unknown> = {};

  if (res.locals.user.role === 'STUDENT') {
    const student = await prisma.studentProfile.findUnique({
      where: { userId: res.locals.user.id },
    });
    if (!student) {
      res.status(403).json({ error: { code: 'Forbidden', message: 'Student profile not found' } });
      return;
    }
    where.studentId = student.id;
  } else if (parsed.data.studentId) {
    where.studentId = parsed.data.studentId;
  }

  if (parsed.data.status) where.status = parsed.data.status;
  const [items, total] = await Promise.all([
    prisma.certificate.findMany({ where, skip, take, orderBy: { issuedAt: 'desc' } }),
    prisma.certificate.count({ where }),
  ]);
  res.json(listResponse(items, page, pageSize, total));
};

export const getCertificate: RequestHandler = async (req, res) => {
  const id = req.params.id;
  const item = await prisma.certificate.findUnique({ where: { id } });
  if (!item) {
    res.status(404).json({ error: { code: 'NotFound', message: 'Certificate not found' } });
    return;
  }
  res.json(item);
};

export const createCertificate: RequestHandler = async (req, res) => {
  const parsed = createCertificateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'ValidationError', details: parsed.error.issues } });
    return;
  }
  if (!parsed.data.studentId) {
    res.status(400).json({ error: { code: 'ValidationError', message: 'studentId required' } });
    return;
  }
  const serial =
    parsed.data.serialNumber || crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase();
  const created = await prisma.certificate.create({
    data: {
      studentId: parsed.data.studentId,
      issuedAt: parsed.data.issuedAt ? new Date(parsed.data.issuedAt) : new Date(),
      serialNumber: serial,
      fileURL: parsed.data.fileURL,
      status: parsed.data.status || 'GENERATED',
    },
  });
  res.status(201).json(created);
};

export const updateCertificate: RequestHandler = async (req, res) => {
  const id = req.params.id;
  const parsed = updateCertificateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'ValidationError', details: parsed.error.issues } });
    return;
  }
  const existing = await prisma.certificate.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: { code: 'NotFound', message: 'Certificate not found' } });
    return;
  }
  const updated = await prisma.certificate.update({
    where: { id },
    data: {
      fileURL: parsed.data.fileURL,
      issuedAt: parsed.data.issuedAt ? new Date(parsed.data.issuedAt) : undefined,
      status: parsed.data.status,
    },
  });
  res.json(updated);
};

export const revokeCertificate: RequestHandler = async (req, res) => {
  const id = req.params.id;
  const existing = await prisma.certificate.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: { code: 'NotFound', message: 'Certificate not found' } });
    return;
  }
  const updated = await prisma.certificate.update({
    where: { id },
    data: { status: 'REVOKED' },
  });
  res.json(updated);
};

export const deleteCertificate: RequestHandler = async (req, res) => {
  const id = req.params.id;
  const existing = await prisma.certificate.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: { code: 'NotFound', message: 'Certificate not found' } });
    return;
  }
  await prisma.certificate.delete({ where: { id } });
  res.status(200).json({ ok: true });
};

export const listStudentCertificates: RequestHandler = async (req, res) => {
  const studentUserId = req.params.id;
  const profile = await prisma.studentProfile.findUnique({ where: { userId: studentUserId } });
  if (!profile) {
    res.status(404).json({ error: { code: 'NotFound', message: 'Student profile not found' } });
    return;
  }
  const parsed = listCertificatesQuery.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'ValidationError', details: parsed.error.issues } });
    return;
  }
  const { skip, take, page, pageSize } = getPagination(parsed.data);
  const [items, total] = await Promise.all([
    prisma.certificate.findMany({
      where: { studentId: profile.id },
      skip,
      take,
      orderBy: { issuedAt: 'desc' },
    }),
    prisma.certificate.count({ where: { studentId: profile.id } }),
  ]);
  res.json(listResponse(items, page, pageSize, total));
};

export const createStudentCertificate: RequestHandler = async (req, res) => {
  const studentUserId = req.params.id;
  const profile = await prisma.studentProfile.findUnique({ where: { userId: studentUserId } });
  if (!profile) {
    res.status(404).json({ error: { code: 'NotFound', message: 'Student profile not found' } });
    return;
  }
  const parsed = createCertificateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'ValidationError', details: parsed.error.issues } });
    return;
  }
  const serial =
    parsed.data.serialNumber || crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase();
  const created = await prisma.certificate.create({
    data: {
      studentId: profile.id,
      issuedAt: parsed.data.issuedAt ? new Date(parsed.data.issuedAt) : new Date(),
      serialNumber: serial,
      fileURL: parsed.data.fileURL,
      status: parsed.data.status || 'GENERATED',
    },
  });
  res.status(201).json(created);
};
