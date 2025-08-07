import { Response } from 'express';
import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import bcrypt from 'bcrypt';
import { AuthenticatedRequest } from '../middleware/auth/authMiddleware';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export const userController = {
  // Get all users (Admin only)
  async getAllUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 10, role, status, tenantId } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const where: any = {};
      if (req.user?.tenantId) {
        where.tenantId = req.user.tenantId;
      }
      if (role) where.role = role as UserRole;
      if (status) where.status = status as UserStatus;
      if (tenantId && req.user?.role === 'ADMIN') where.tenantId = tenantId as string;

      const users = await prisma.user.findMany({
        where,
        skip: offset,
        take: Number(limit),
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          avatar: true,
          role: true,
          status: true,
          tenantId: true,
          lastLoginAt: true,
          createdAt: true,
          emailVerified: true
        },
        orderBy: { createdAt: 'desc' }
      });

      const total = await prisma.user.count({ where });

      res.json({
        success: true,
        data: users,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      logger.error('Error fetching users:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch users'
      });
      return;
    }
  },

  // Get user by ID
  async getUserById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const currentUser = req.user!;

      // Users can only view their own profile unless admin
      if (currentUser.role !== 'ADMIN' && currentUser.id !== id) {
        res.status(403).json({
          success: false,
          error: 'Access denied: Cannot view other user profiles'
        });
        return;
      }

      const where: any = { id };
      if (currentUser.tenantId && currentUser.role !== 'ADMIN') {
        where.tenantId = currentUser.tenantId;
      }

      const user = await prisma.user.findFirst({
        where,
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          avatar: true,
          role: true,
          status: true,
          tenantId: true,
          lastLoginAt: true,
          createdAt: true,
          emailVerified: true,
          metadata: true,
          userPreferences: {
            select: {
              autoplay: true,
              playbackSpeed: true,
              subtitles: true,
              theme: true,
              language: true,
              emailNotifications: true,
              progressNotifications: true,
              allowAnalytics: true
            }
          }
        }
      });

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      logger.error('Error fetching user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user'
      });
      return;
    }
  },

  // Create new user (Admin only)
  async createUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        email,
        username,
        firstName,
        lastName,
        password,
        role = UserRole.STUDENT,
        tenantId
      } = req.body;

      const currentUser = req.user!;

      // Set tenant context
      let userTenantId = currentUser.tenantId;
      if (tenantId && currentUser.role === 'ADMIN') {
        userTenantId = tenantId;
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      const user = await prisma.user.create({
        data: {
          email,
          username,
          firstName,
          lastName,
          passwordHash,
          role,
          tenantId: userTenantId,
          status: UserStatus.PENDING_VERIFICATION
        },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          tenantId: true,
          createdAt: true
        }
      });

      // Create default user preferences
      await prisma.userPreference.create({
        data: {
          userId: user.id
        }
      });

      logger.info(`User created: ${user.email} by ${currentUser.email}`);

      res.status(201).json({
        success: true,
        data: user,
        message: 'User created successfully'
      });
    } catch (error: any) {
      logger.error('Error creating user:', error);
      
      if (error.code === 'P2002') {
        res.status(409).json({
          success: false,
          error: 'User with this email or username already exists'
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to create user'
      });
      return;
    }
  },

  // Update user
  async updateUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const currentUser = req.user!;
      const updateData = req.body;

      // Users can only update their own profile unless admin
      if (currentUser.role !== 'ADMIN' && currentUser.id !== id) {
        res.status(403).json({
          success: false,
          error: 'Access denied: Cannot update other user profiles'
        });
        return;
      }

      // Remove sensitive fields that shouldn't be updated directly
      delete updateData.passwordHash;
      delete updateData.id;
      delete updateData.createdAt;

      // Only admins can change roles and status
      if (currentUser.role !== 'ADMIN') {
        delete updateData.role;
        delete updateData.status;
        delete updateData.tenantId;
      }

      const where: any = { id };
      if (currentUser.tenantId && currentUser.role !== 'ADMIN') {
        where.tenantId = currentUser.tenantId;
      }

      const user = await prisma.user.update({
        where,
        data: updateData,
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          avatar: true,
          role: true,
          status: true,
          tenantId: true,
          updatedAt: true
        }
      });

      logger.info(`User updated: ${user.email} by ${currentUser.email}`);

      res.json({
        success: true,
        data: user,
        message: 'User updated successfully'
      });
    } catch (error: any) {
      logger.error('Error updating user:', error);
      
      if (error.code === 'P2002') {
        res.status(409).json({
          success: false,
          error: 'Email or username already exists'
        });
        return;
      }

      if (error.code === 'P2025') {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to update user'
      });
      return;
    }
  },

  // Change password
  async changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { currentPassword, newPassword } = req.body;
      const currentUser = req.user!;

      // Users can only change their own password unless admin
      if (currentUser.role !== 'ADMIN' && currentUser.id !== id) {
        res.status(403).json({
          success: false,
          error: 'Access denied: Cannot change other user passwords'
        });
        return;
      }

      const where: any = { id };
      if (currentUser.tenantId && currentUser.role !== 'ADMIN') {
        where.tenantId = currentUser.tenantId;
      }

      const user = await prisma.user.findFirst({ where });
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }

      // Verify current password (unless admin)
      if (currentUser.role !== 'ADMIN') {
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isCurrentPasswordValid) {
          res.status(400).json({
            success: false,
            error: 'Current password is incorrect'
          });
        return;
        }
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, 12);

      await prisma.user.update({
        where: { id },
        data: {
          passwordHash: newPasswordHash,
          updatedAt: new Date()
        }
      });

      logger.info(`Password changed for user: ${user.email} by ${currentUser.email}`);

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      logger.error('Error changing password:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to change password'
      });
      return;
    }
  },

  // Update user preferences
  async updatePreferences(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const currentUser = req.user!;
      const preferencesData = req.body;

      // Users can only update their own preferences
      if (currentUser.id !== id) {
        res.status(403).json({
          success: false,
          error: 'Access denied: Cannot update other user preferences'
        });
        return;
      }

      const preferences = await prisma.userPreference.upsert({
        where: { userId: id },
        create: {
          userId: id,
          ...preferencesData
        },
        update: preferencesData,
        select: {
          autoplay: true,
          playbackSpeed: true,
          subtitles: true,
          theme: true,
          language: true,
          emailNotifications: true,
          progressNotifications: true,
          allowAnalytics: true,
          customSettings: true,
          updatedAt: true
        }
      });

      res.json({
        success: true,
        data: preferences,
        message: 'Preferences updated successfully'
      });
    } catch (error) {
      logger.error('Error updating preferences:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update preferences'
      });
      return;
    }
  },

  // Delete user (Admin only)
  async deleteUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const currentUser = req.user!;

      // Cannot delete own account
      if (currentUser.id === id) {
        res.status(400).json({
          success: false,
          error: 'Cannot delete your own account'
        });
        return;
      }

      const where: any = { id };
      if (currentUser.tenantId) {
        where.tenantId = currentUser.tenantId;
      }

      const user = await prisma.user.findFirst({ where });
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }

      await prisma.user.delete({ where: { id } });

      logger.info(`User deleted: ${user.email} by ${currentUser.email}`);

      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete user'
      });
      return;
    }
  }
};