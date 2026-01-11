import { type RequestHandler } from 'express';
import { ValidationError } from '../utils/errors';
import {
  getMeData,
  updateMeData,
  updatePasswordData,
  updateNotificationsData,
} from '../services/users.service';
import { updateMeSchema, updatePasswordSchema, updateNotifSchema } from '../validators/users';
import { asyncHandler } from '../utils/asyncHandler';
import { toUserResponse } from '../utils/transformers';

export const getMe: RequestHandler = asyncHandler(async (req, res) => {
  const user = res.locals.user;
  const { profile, prefs } = await getMeData(user.id);
  res.json({ ...toUserResponse(user), profile, notificationPref: prefs });
});

export const updateMe: RequestHandler = asyncHandler(async (req, res) => {
  const parsed = updateMeSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues);
  }
  const userId = res.locals.user.id;
  const updated = await updateMeData(userId, {
    name: parsed.data.name,
    initials: parsed.data.initials,
  });
  res.json({ user: toUserResponse(updated) });
});

export const updatePassword: RequestHandler = asyncHandler(async (req, res) => {
  const parsed = updatePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues);
  }
  const result = await updatePasswordData(
    res.locals.user.id,
    parsed.data.currentPassword,
    parsed.data.newPassword,
  );
  res.json(result);
});

export const updateNotifications: RequestHandler = asyncHandler(async (req, res) => {
  const parsed = updateNotifSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues);
  }
  const userId = res.locals.user.id;
  const updated = await updateNotificationsData(userId, parsed.data);
  res.json({ notificationPref: updated });
});
