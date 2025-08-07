import bcrypt from 'bcrypt';
import { prisma } from '@/config/database';
import { config } from '@/config/environment';
import { jwtService } from './jwtService';
import { AppError, AuthenticatedUser } from '@/types';
import { UserRole, UserStatus } from '@prisma/client';
import { logger } from '@/utils/logger';

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  username?: string;
  role?: UserRole;
  tenantId?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResult {
  user: AuthenticatedUser;
  accessToken: string;
  refreshToken: string;
}

class AuthService {
  /**
   * Register a new user
   */
  async register(data: RegisterData): Promise<AuthResult> {
    const { email, password, firstName, lastName, username, role = UserRole.STUDENT, tenantId } = data;

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          ...(username ? [{ username }] : []),
        ],
      },
    });

    if (existingUser) {
      if (existingUser.email === email) {
        throw new AppError('Email already registered', 409);
      }
      if (existingUser.username === username) {
        throw new AppError('Username already taken', 409);
      }
    }

    // Hash password
    const passwordHash = await this.hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        username,
        role,
        tenantId,
        status: UserStatus.PENDING_VERIFICATION,
      },
    });

    const authenticatedUser: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      tenantId: user.tenantId || undefined,
    };

    // Generate tokens
    const { accessToken, refreshToken } = jwtService.generateTokenPair(authenticatedUser);

    logger.info(`User registered: ${user.email}`);

    return {
      user: authenticatedUser,
      accessToken,
      refreshToken,
    };
  }

  /**
   * Login user
   */
  async login(data: LoginData): Promise<AuthResult> {
    const { email, password } = data;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    // Check password
    const isValidPassword = await this.comparePassword(password, user.passwordHash);
    if (!isValidPassword) {
      throw new AppError('Invalid credentials', 401);
    }

    // Check user status
    if (user.status === UserStatus.SUSPENDED) {
      throw new AppError('Account suspended', 403);
    }

    if (user.status === UserStatus.INACTIVE) {
      throw new AppError('Account inactive', 403);
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const authenticatedUser: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      tenantId: user.tenantId || undefined,
    };

    // Generate tokens
    const { accessToken, refreshToken } = jwtService.generateTokenPair(authenticatedUser);

    logger.info(`User logged in: ${user.email}`);

    return {
      user: authenticatedUser,
      accessToken,
      refreshToken,
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<AuthResult> {
    // Verify refresh token
    const payload = jwtService.verifyRefreshToken(refreshToken);

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Check user status
    if (user.status === UserStatus.SUSPENDED || user.status === UserStatus.INACTIVE) {
      throw new AppError('Account not active', 403);
    }

    const authenticatedUser: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      tenantId: user.tenantId || undefined,
    };

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = jwtService.generateTokenPair(authenticatedUser);

    return {
      user: authenticatedUser,
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<AuthenticatedUser | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      tenantId: user.tenantId || undefined,
    };
  }

  /**
   * Verify email
   */
  async verifyEmail(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified: new Date(),
        status: UserStatus.ACTIVE,
      },
    });

    logger.info(`Email verified for user: ${userId}`);
  }

  /**
   * Change password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Verify current password
    const isValidPassword = await this.comparePassword(currentPassword, user.passwordHash);
    if (!isValidPassword) {
      throw new AppError('Current password is incorrect', 400);
    }

    // Hash new password
    const newPasswordHash = await this.hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    logger.info(`Password changed for user: ${userId}`);
  }

  /**
   * Reset password
   */
  async resetPassword(email: string, newPassword: string): Promise<void> {
    const passwordHash = await this.hashPassword(newPassword);

    const user = await prisma.user.update({
      where: { email },
      data: { passwordHash },
    });

    logger.info(`Password reset for user: ${user.id}`);
  }

  /**
   * Hash password
   */
  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, config.security.bcryptSaltRounds);
  }

  /**
   * Compare password
   */
  private async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Logout (for audit purposes)
   */
  async logout(userId: string): Promise<void> {
    logger.info(`User logged out: ${userId}`);
    // In a more advanced implementation, you might maintain a blacklist of tokens
  }
}

export const authService = new AuthService();
export default authService;