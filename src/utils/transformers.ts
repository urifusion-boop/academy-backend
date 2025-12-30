import { type User } from '@prisma/client';

export type UserResponse = Omit<User, 'passwordHash'>;

export function toUserResponse(user: User): UserResponse {
  const { passwordHash: _, ...rest } = user;
  void _;
  return rest;
}
