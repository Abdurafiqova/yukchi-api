import type { UserRole } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  phone: string;
  role: UserRole;
  fullName: string | null;
}

export interface JwtPayload {
  sub: string;
  phone: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}
