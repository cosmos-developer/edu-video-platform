import { UserRole } from '@prisma/client';

export interface User {
  id: string;
  email: string;
  username?: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  role: UserRole;
  tenantId?: string;
  status: string;
  lastLoginAt?: Date;
  emailVerified?: Date;
  createdAt: Date;
}

export interface AuthenticatedUser extends User {}

export interface AuthContext {
  user: AuthenticatedUser;
  isAuthenticated: boolean;
}