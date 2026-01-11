import bcrypt from 'bcrypt'
import { prisma } from '../lib/prisma'
import { NotFoundError, UnauthorizedError } from '../utils/errors'

export async function getMeData(userId: string) {
  const profile = await prisma.studentProfile.findUnique({ where: { userId } })
  const prefs = await prisma.notificationPref.findUnique({ where: { userId } })
  return { profile, prefs }
}

export async function updateMeData(userId: string, data: { name?: string; initials?: string }) {
  const updated = await prisma.user.update({ where: { id: userId }, data })
  return updated
}

export async function updatePasswordData(
  userId: string,
  currentPassword: string | null | undefined,
  newPassword: string,
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User not found');

  if (currentPassword) {
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) throw new UnauthorizedError('Invalid credentials');
  } else {
    // If currentPassword is not provided, allow update ONLY if password is not set
    // We use a specific placeholder 'NOT_SET' for users created via public payment flow
    if (user.passwordHash !== 'NOT_SET') {
      throw new UnauthorizedError('Current password is required');
    }
  }

  const hash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } });
  return { ok: true };
}

export async function updateNotificationsData(
  userId: string,
  data: { emailNews?: boolean; emailAssignments?: boolean; emailGrades?: boolean }
) {
  const updated = await prisma.notificationPref.upsert({
    where: { userId },
    update: data,
    create: {
      userId,
      emailNews: data.emailNews ?? false,
      emailAssignments: data.emailAssignments ?? true,
      emailGrades: data.emailGrades ?? true
    }
  })
  return updated
}
