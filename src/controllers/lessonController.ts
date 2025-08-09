import { Response } from 'express';
import { PrismaClient, LessonStatus } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth/authMiddleware';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export const lessonController = {
  // Get all lessons with filtering
  async getAllLessons(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { 
        page = 1, 
        limit = 10, 
        status,
        difficulty,
        createdById,
        search
      } = req.query;
      
      const offset = (Number(page) - 1) * Number(limit);
      const currentUser = req.user!;

      const where: any = {};

      // Multi-tenant filtering
      if (currentUser.tenantId) {
        where.tenantId = currentUser.tenantId;
      }

      // Additional filters first
      if (status) where.status = status as LessonStatus;
      if (difficulty) where.difficulty = difficulty as string;

      // Role-based filtering
      if (currentUser.role === 'TEACHER') {
        // If createdById filter is requested and it's the teacher's own ID, allow it
        if (createdById && createdById === currentUser.id) {
          where.createdById = currentUser.id;
        } else {
          // Teachers can only see their own lessons and published lessons
          where.OR = [
            { createdById: currentUser.id },
            { status: 'PUBLISHED' }
          ];
        }
      } else if (currentUser.role === 'STUDENT') {
        // Students can only see published lessons
        where.status = 'PUBLISHED';
      } else if (currentUser.role === 'ADMIN') {
        // Admins can filter by any createdById
        if (createdById) {
          where.createdById = createdById as string;
        }
      }

      // Search functionality (needs to be combined with existing OR conditions)
      if (search) {
        const searchConditions = [
          { title: { contains: search as string, mode: 'insensitive' } },
          { description: { contains: search as string, mode: 'insensitive' } },
          { tags: { has: search as string } }
        ];

        if (where.OR) {
          // Combine existing OR conditions with search using AND
          where.AND = [
            { OR: where.OR },
            { OR: searchConditions }
          ];
          delete where.OR;
        } else {
          where.OR = searchConditions;
        }
      }

      const lessons = await prisma.lesson.findMany({
        where,
        skip: offset,
        take: Number(limit),
        select: {
          id: true,
          title: true,
          description: true,
          thumbnail: true,
          status: true,
          order: true,
          objectives: true,
          estimatedTime: true,
          difficulty: true,
          tags: true,
          createdAt: true,
          publishedAt: true,
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true
            }
          },
          _count: {
            select: {
              videoGroups: true,
              studentProgress: true
            }
          }
        },
        orderBy: [
          { order: 'asc' },
          { createdAt: 'desc' }
        ]
      });

      const total = await prisma.lesson.count({ where });

      res.json({
        success: true,
        data: {
          items: lessons,
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      logger.error('Error fetching lessons:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch lessons'
      });
      return;
    }
  },

  // Get lesson by ID with full details - UNIFIED PATTERN FOR ALL ROLES
  async getLessonById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const currentUser = req.user!;

      const where: any = { id };
      
      // Multi-tenant filtering
      if (currentUser.tenantId) {
        where.tenantId = currentUser.tenantId;
      }

      // Role-based filtering for students
      if (currentUser.role === 'STUDENT') {
        where.status = 'PUBLISHED'; // Students only see published lessons
      }

      const lesson = await prisma.lesson.findFirst({
        where,
        include: {
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
              email: true
            }
          },
          // ALWAYS include videoGroups for ALL roles - unified pattern
          videoGroups: {
            orderBy: { order: 'asc' },
            include: {
              videos: {
                orderBy: { order: 'asc' },
                // Role-based video filtering
                where: currentUser.role === 'STUDENT' 
                  ? { status: 'READY' } // Students only see ready videos
                  : {}, // Teachers and admins see all videos
                select: {
                  id: true,
                  title: true,
                  description: true,
                  order: true,
                  status: true,
                  duration: true,
                  thumbnailPath: true,
                  // Only include sensitive fields for teachers/admins
                  filePath: currentUser.role === 'TEACHER' || currentUser.role === 'ADMIN' ? true : false,
                  size: true,
                  mimeType: true,
                  processingStatus: currentUser.role === 'TEACHER' || currentUser.role === 'ADMIN' ? true : false,
                  uploadedAt: true,
                  _count: {
                    select: {
                      milestones: true
                    }
                  }
                }
              },
              _count: {
                select: {
                  videos: true
                }
              }
            }
          },
          // Include progress for students
          studentProgress: currentUser.role === 'STUDENT' ? {
            where: { studentId: currentUser.id },
            select: {
              id: true,
              isCompleted: true,
              completionPercent: true,
              totalTimeSpent: true,
              averageScore: true,
              startedAt: true,
              completedAt: true
            }
          } : false,
          _count: {
            select: {
              videoGroups: true,
              studentProgress: true
            }
          }
        }
      });

      if (!lesson) {
        res.status(404).json({
          success: false,
          error: 'Lesson not found'
        });
        return;
      }

      // Additional access control for teachers
      if (currentUser.role === 'TEACHER' && 
          lesson.createdById !== currentUser.id && 
          lesson.status !== 'PUBLISHED') {
        res.status(403).json({
          success: false,
          error: 'Access denied: Cannot view unpublished lessons from other teachers'
        });
        return;
      }

      // Convert BigInt values to strings to avoid serialization issues
      const processedLesson = JSON.parse(JSON.stringify(lesson, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      ));

      res.json({
        success: true,
        data: processedLesson
      });
    } catch (error) {
      logger.error('Error fetching lesson:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch lesson'
      });
      return;
    }
  },

  // Create new lesson (Teacher/Admin only)
  async createLesson(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        title,
        description,
        thumbnail,
        objectives = [],
        estimatedTime,
        difficulty,
        tags = [],
        order
      } = req.body;
      
      const currentUser = req.user!;

      const lesson = await prisma.lesson.create({
        data: {
          title,
          description,
          thumbnail,
          objectives,
          estimatedTime,
          difficulty,
          tags,
          order,
          createdById: currentUser.id,
          tenantId: currentUser.tenantId,
          status: LessonStatus.DRAFT
        },
        include: {
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true
            }
          }
        }
      });

      logger.info(`Lesson created: ${lesson.title} by ${currentUser.email}`);

      res.status(201).json({
        success: true,
        data: lesson,
        message: 'Lesson created successfully'
      });
    } catch (error) {
      logger.error('Error creating lesson:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create lesson'
      });
      return;
    }
  },

  // Update lesson
  async updateLesson(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const currentUser = req.user!;

      const where: any = { id };
      
      // Multi-tenant filtering
      if (currentUser.tenantId) {
        where.tenantId = currentUser.tenantId;
      }

      // Check ownership for teachers
      if (currentUser.role === 'TEACHER') {
        where.createdById = currentUser.id;
      }

      const lesson = await prisma.lesson.update({
        where,
        data: updateData,
        include: {
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true
            }
          }
        }
      });

      logger.info(`Lesson updated: ${lesson.title} by ${currentUser.email}`);

      res.json({
        success: true,
        data: lesson,
        message: 'Lesson updated successfully'
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        res.status(404).json({
          success: false,
          error: 'Lesson not found or access denied'
        });
        return;
      }

      logger.error('Error updating lesson:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update lesson'
      });
      return;
    }
  },

  // Publish lesson
  async publishLesson(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const currentUser = req.user!;

      const where: any = { id };
      
      // Multi-tenant filtering
      if (currentUser.tenantId) {
        where.tenantId = currentUser.tenantId;
      }

      // Check ownership for teachers
      if (currentUser.role === 'TEACHER') {
        where.createdById = currentUser.id;
      }

      // Validate lesson has content before publishing
      const lessonWithContent = await prisma.lesson.findFirst({
        where,
        include: {
          videoGroups: {
            include: {
              videos: {
                where: { status: 'READY' }
              }
            }
          }
        }
      });

      if (!lessonWithContent) {
        res.status(404).json({
          success: false,
          error: 'Lesson not found or access denied'
        });
        return;
      }

      const hasReadyVideos = lessonWithContent.videoGroups.some(
        group => group.videos.length > 0
      );

      if (!hasReadyVideos) {
        res.status(400).json({
          success: false,
          error: 'Cannot publish lesson without ready videos'
        });
        return;
      }

      const lesson = await prisma.lesson.update({
        where: { id },
        data: {
          status: LessonStatus.PUBLISHED,
          publishedAt: new Date()
        },
        include: {
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      logger.info(`Lesson published: ${lesson.title} by ${currentUser.email}`);

      res.json({
        success: true,
        data: lesson,
        message: 'Lesson published successfully'
      });
    } catch (error) {
      logger.error('Error publishing lesson:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to publish lesson'
      });
      return;
    }
  },

  // Delete lesson
  async deleteLesson(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const currentUser = req.user!;

      const where: any = { id };
      
      // Multi-tenant filtering
      if (currentUser.tenantId) {
        where.tenantId = currentUser.tenantId;
      }

      // Check ownership for teachers
      if (currentUser.role === 'TEACHER') {
        where.createdById = currentUser.id;
      }

      // Check if lesson has student progress
      const lessonWithProgress = await prisma.lesson.findFirst({
        where,
        include: {
          _count: {
            select: {
              studentProgress: true
            }
          }
        }
      });

      if (!lessonWithProgress) {
        res.status(404).json({
          success: false,
          error: 'Lesson not found or access denied'
        });
        return;
      }

      if (lessonWithProgress._count.studentProgress > 0) {
        res.status(400).json({
          success: false,
          error: 'Cannot delete lesson with existing student progress. Archive it instead.'
        });
        return;
      }

      await prisma.lesson.delete({ where: { id } });

      logger.info(`Lesson deleted: ${lessonWithProgress.title} by ${currentUser.email}`);

      res.json({
        success: true,
        message: 'Lesson deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting lesson:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete lesson'
      });
      return;
    }
  },

  // Archive lesson
  async archiveLesson(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const currentUser = req.user!;

      const where: any = { id };
      
      // Multi-tenant filtering
      if (currentUser.tenantId) {
        where.tenantId = currentUser.tenantId;
      }

      // Check ownership for teachers
      if (currentUser.role === 'TEACHER') {
        where.createdById = currentUser.id;
      }

      const lesson = await prisma.lesson.update({
        where,
        data: {
          status: LessonStatus.ARCHIVED
        },
        include: {
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      logger.info(`Lesson archived: ${lesson.title} by ${currentUser.email}`);

      res.json({
        success: true,
        data: lesson,
        message: 'Lesson archived successfully'
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        res.status(404).json({
          success: false,
          error: 'Lesson not found or access denied'
        });
        return;
      }

      logger.error('Error archiving lesson:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to archive lesson'
      });
      return;
    }
  }
};