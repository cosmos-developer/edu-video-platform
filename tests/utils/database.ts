import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import bcrypt from 'bcrypt';

let prisma: PrismaClient;

export const getTestPrismaClient = (): PrismaClient => {
  if (!prisma) {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL_TEST || 'postgresql://postgres:postgres@localhost:5432/learning_platform_test'
        }
      },
      log: process.env.DEBUG === 'true' ? ['query', 'error', 'warn'] : ['error']
    });
  }
  return prisma;
};

export const setupTestDatabase = async (): Promise<void> => {
  const prisma = getTestPrismaClient();
  
  try {
    // Run migrations on test database
    execSync('npx prisma migrate deploy --schema=database/prisma/schema.prisma', {
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL_TEST
      }
    });
    
    // Clear all data
    await cleanupDatabase();
    
    // Seed basic test data
    await seedTestData();
  } catch (error) {
    console.error('Failed to setup test database:', error);
    throw error;
  }
};

export const cleanupDatabase = async (): Promise<void> => {
  const prisma = getTestPrismaClient();
  
  // Delete in correct order to respect foreign key constraints
  await prisma.$transaction([
    prisma.userAnswer.deleteMany(),
    prisma.milestoneProgress.deleteMany(),
    prisma.videoSession.deleteMany(),
    prisma.lessonProgress.deleteMany(),
    prisma.enrollment.deleteMany(),
    prisma.question.deleteMany(),
    prisma.milestone.deleteMany(),
    prisma.video.deleteMany(),
    prisma.videoGroup.deleteMany(),
    prisma.lesson.deleteMany(),
    prisma.userPreference.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.user.deleteMany(),
    prisma.aIConfiguration.deleteMany(),
    prisma.systemConfig.deleteMany(),
  ]);
};

export const seedTestData = async (): Promise<void> => {
  const prisma = getTestPrismaClient();
  const passwordHash = await bcrypt.hash('TestPassword123!', 10);
  
  // Create test users
  await prisma.user.createMany({
    data: [
      {
        id: 'test-teacher-id',
        email: 'test.teacher@example.com',
        firstName: 'Test',
        lastName: 'Teacher',
        role: 'TEACHER',
        status: 'ACTIVE',
        passwordHash,
        emailVerified: new Date()
      },
      {
        id: 'test-student-id',
        email: 'test.student@example.com',
        firstName: 'Test',
        lastName: 'Student',
        role: 'STUDENT',
        status: 'ACTIVE',
        passwordHash,
        emailVerified: new Date()
      },
      {
        id: 'test-admin-id',
        email: 'test.admin@example.com',
        firstName: 'Test',
        lastName: 'Admin',
        role: 'ADMIN',
        status: 'ACTIVE',
        passwordHash,
        emailVerified: new Date()
      }
    ]
  });
  
  // Create test AI configuration
  await prisma.aIConfiguration.create({
    data: {
      id: 'test-ai-config',
      provider: 'OPENAI',
      name: 'Test AI Configuration',
      model: 'gpt-3.5-turbo',
      parameters: {
        temperature: 0.7,
        maxTokens: 2000
      },
      isActive: true,
      rateLimit: 60,
      maxTokens: 4000
    }
  });
};

export const createTestUser = async (overrides?: Partial<any>) => {
  const prisma = getTestPrismaClient();
  const passwordHash = await bcrypt.hash('TestPassword123!', 10);
  
  return prisma.user.create({
    data: {
      email: `test${Date.now()}@example.com`,
      firstName: 'Test',
      lastName: 'User',
      role: 'STUDENT',
      status: 'ACTIVE',
      passwordHash,
      emailVerified: new Date(),
      ...overrides
    }
  });
};

export const createTestLesson = async (teacherId: string, overrides?: Partial<any>) => {
  const prisma = getTestPrismaClient();
  
  return prisma.lesson.create({
    data: {
      title: `Test Lesson ${Date.now()}`,
      description: 'Test lesson description',
      status: 'PUBLISHED',
      order: 1,
      createdById: teacherId,
      objectives: ['Test objective 1', 'Test objective 2'],
      estimatedTime: 30,
      difficulty: 'beginner',
      tags: ['test'],
      publishedAt: new Date(),
      ...overrides
    }
  });
};

export const disconnectTestDatabase = async (): Promise<void> => {
  if (prisma) {
    await prisma.$disconnect();
  }
};