import { User, UserRole, UserStatus, Lesson, LessonStatus, Video, VideoStatus, Milestone, MilestoneType, Question, QuestionType, AIProvider } from '@prisma/client';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

/**
 * Factory for creating test users
 */
export class UserFactory {
  private static counter = 0;

  static async create(overrides?: Partial<User>): Promise<Partial<User>> {
    this.counter++;
    const timestamp = Date.now();
    
    return {
      id: uuidv4(),
      email: `test.user${this.counter}.${timestamp}@example.com`,
      firstName: `Test${this.counter}`,
      lastName: `User${this.counter}`,
      role: 'STUDENT' as UserRole,
      status: 'ACTIVE' as UserStatus,
      passwordHash: await bcrypt.hash('TestPassword123!', 10),
      emailVerified: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  }

  static async createMany(count: number, overrides?: Partial<User>): Promise<Partial<User>[]> {
    const users: Partial<User>[] = [];
    for (let i = 0; i < count; i++) {
      users.push(await this.create(overrides));
    }
    return users;
  }

  static async createWithRole(role: UserRole, overrides?: Partial<User>): Promise<Partial<User>> {
    return this.create({ role, ...overrides });
  }

  static async createTeacher(overrides?: Partial<User>): Promise<Partial<User>> {
    return this.createWithRole('TEACHER', overrides);
  }

  static async createStudent(overrides?: Partial<User>): Promise<Partial<User>> {
    return this.createWithRole('STUDENT', overrides);
  }

  static async createAdmin(overrides?: Partial<User>): Promise<Partial<User>> {
    return this.createWithRole('ADMIN', overrides);
  }
}

/**
 * Factory for creating test lessons
 */
export class LessonFactory {
  private static counter = 0;

  static create(teacherId: string, overrides?: Partial<Lesson>): Partial<Lesson> {
    this.counter++;
    const timestamp = Date.now();
    
    return {
      id: uuidv4(),
      title: `Test Lesson ${this.counter}`,
      description: `Description for test lesson ${this.counter}`,
      status: 'PUBLISHED' as LessonStatus,
      order: this.counter,
      createdById: teacherId,
      objectives: ['Objective 1', 'Objective 2', 'Objective 3'],
      estimatedTime: 30,
      difficulty: 'beginner',
      tags: ['test', 'automated'],
      publishedAt: new Date(),
      metadata: { isTest: true },
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  }

  static createDraft(teacherId: string, overrides?: Partial<Lesson>): Partial<Lesson> {
    return this.create(teacherId, { status: 'DRAFT' as LessonStatus, publishedAt: null, ...overrides });
  }

  static createPublished(teacherId: string, overrides?: Partial<Lesson>): Partial<Lesson> {
    return this.create(teacherId, { status: 'PUBLISHED' as LessonStatus, ...overrides });
  }

  static createMany(count: number, teacherId: string, overrides?: Partial<Lesson>): Partial<Lesson>[] {
    const lessons: Partial<Lesson>[] = [];
    for (let i = 0; i < count; i++) {
      lessons.push(this.create(teacherId, overrides));
    }
    return lessons;
  }
}

/**
 * Factory for creating test videos
 */
export class VideoFactory {
  private static counter = 0;

  static create(videoGroupId: string, overrides?: Partial<Video>): Partial<Video> {
    this.counter++;
    const timestamp = Date.now();
    
    return {
      id: uuidv4(),
      videoGroupId,
      title: `Test Video ${this.counter}`,
      description: `Description for test video ${this.counter}`,
      order: this.counter,
      status: 'READY' as VideoStatus,
      gcsPath: `test/videos/video${this.counter}.mp4`,
      gcsUrl: `https://storage.googleapis.com/test-bucket/video${this.counter}.mp4`,
      duration: 300, // 5 minutes
      thumbnailUrl: `https://storage.googleapis.com/test-bucket/thumbnails/video${this.counter}.jpg`,
      metadata: {
        resolution: '1920x1080',
        frameRate: 30,
        codec: 'h264'
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  }

  static createProcessing(videoGroupId: string, overrides?: Partial<Video>): Partial<Video> {
    return this.create(videoGroupId, { status: 'PROCESSING' as VideoStatus, ...overrides });
  }

  static createReady(videoGroupId: string, overrides?: Partial<Video>): Partial<Video> {
    return this.create(videoGroupId, { status: 'READY' as VideoStatus, ...overrides });
  }

  static createMany(count: number, videoGroupId: string, overrides?: Partial<Video>): Partial<Video>[] {
    const videos: Partial<Video>[] = [];
    for (let i = 0; i < count; i++) {
      videos.push(this.create(videoGroupId, overrides));
    }
    return videos;
  }
}

/**
 * Factory for creating test milestones
 */
export class MilestoneFactory {
  private static counter = 0;

  static create(videoId: string, overrides?: Partial<Milestone>): Partial<Milestone> {
    this.counter++;
    
    return {
      id: uuidv4(),
      videoId,
      type: 'QUIZ' as MilestoneType,
      timestamp: 30 + (this.counter * 30), // Every 30 seconds
      title: `Milestone ${this.counter}`,
      description: `Test milestone ${this.counter}`,
      order: this.counter,
      required: true,
      passingScore: 0.7,
      retryLimit: 3,
      metadata: { isTest: true },
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  }

  static createQuiz(videoId: string, timestamp: number, overrides?: Partial<Milestone>): Partial<Milestone> {
    return this.create(videoId, { type: 'QUIZ' as MilestoneType, timestamp, ...overrides });
  }

  static createPause(videoId: string, timestamp: number, overrides?: Partial<Milestone>): Partial<Milestone> {
    return this.create(videoId, { type: 'PAUSE' as MilestoneType, timestamp, ...overrides });
  }

  static createInteractive(videoId: string, timestamp: number, overrides?: Partial<Milestone>): Partial<Milestone> {
    return this.create(videoId, { type: 'INTERACTIVE' as MilestoneType, timestamp, ...overrides });
  }

  static createMany(count: number, videoId: string, overrides?: Partial<Milestone>): Partial<Milestone>[] {
    const milestones: Partial<Milestone>[] = [];
    for (let i = 0; i < count; i++) {
      milestones.push(this.create(videoId, overrides));
    }
    return milestones;
  }
}

/**
 * Factory for creating test questions
 */
export class QuestionFactory {
  private static counter = 0;

  static create(milestoneId: string, overrides?: Partial<Question>): Partial<Question> {
    this.counter++;
    
    return {
      id: uuidv4(),
      milestoneId,
      type: 'MULTIPLE_CHOICE' as QuestionType,
      question: `Test question ${this.counter}?`,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: 'Option A',
      explanation: `This is the explanation for question ${this.counter}`,
      order: this.counter,
      points: 10,
      timeLimit: 60,
      metadata: { isTest: true },
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  }

  static createMultipleChoice(milestoneId: string, overrides?: Partial<Question>): Partial<Question> {
    return this.create(milestoneId, {
      type: 'MULTIPLE_CHOICE' as QuestionType,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: 'Option A',
      ...overrides
    });
  }

  static createTrueFalse(milestoneId: string, overrides?: Partial<Question>): Partial<Question> {
    return this.create(milestoneId, {
      type: 'TRUE_FALSE' as QuestionType,
      options: ['True', 'False'],
      correctAnswer: 'True',
      ...overrides
    });
  }

  static createShortAnswer(milestoneId: string, overrides?: Partial<Question>): Partial<Question> {
    return this.create(milestoneId, {
      type: 'SHORT_ANSWER' as QuestionType,
      options: null,
      correctAnswer: 'Expected answer',
      ...overrides
    });
  }

  static createFillInTheBlank(milestoneId: string, overrides?: Partial<Question>): Partial<Question> {
    return this.create(milestoneId, {
      type: 'FILL_IN_THE_BLANK' as QuestionType,
      question: 'The capital of France is ___',
      options: null,
      correctAnswer: 'Paris',
      ...overrides
    });
  }

  static createMany(count: number, milestoneId: string, overrides?: Partial<Question>): Partial<Question>[] {
    const questions: Partial<Question>[] = [];
    for (let i = 0; i < count; i++) {
      questions.push(this.create(milestoneId, overrides));
    }
    return questions;
  }

  static createMixedTypes(milestoneId: string): Partial<Question>[] {
    return [
      this.createMultipleChoice(milestoneId),
      this.createTrueFalse(milestoneId),
      this.createShortAnswer(milestoneId),
      this.createFillInTheBlank(milestoneId)
    ];
  }
}

/**
 * Factory for creating AI-generated questions
 */
export class AIQuestionFactory {
  static create(milestoneId: string, provider: AIProvider, overrides?: Partial<Question>): Partial<Question> {
    return QuestionFactory.create(milestoneId, {
      aiGenerated: true,
      aiProvider: provider,
      aiModel: provider === 'OPENAI' ? 'gpt-3.5-turbo' : 'claude-3-haiku',
      aiConfigId: `test-${provider.toLowerCase()}-config`,
      generationPrompt: 'Generate a question about the video content',
      ...overrides
    });
  }

  static createOpenAI(milestoneId: string, overrides?: Partial<Question>): Partial<Question> {
    return this.create(milestoneId, 'OPENAI', overrides);
  }

  static createClaude(milestoneId: string, overrides?: Partial<Question>): Partial<Question> {
    return this.create(milestoneId, 'CLAUDE', overrides);
  }
}

/**
 * Factory for creating complete test scenarios
 */
export class ScenarioFactory {
  static async createCompleteLesson() {
    const teacher = await UserFactory.createTeacher();
    const lesson = LessonFactory.createPublished(teacher.id!);
    
    // Create video group
    const videoGroup = {
      id: uuidv4(),
      lessonId: lesson.id!,
      title: 'Main Videos',
      description: 'Primary video content',
      order: 1
    };
    
    // Create videos
    const video1 = VideoFactory.createReady(videoGroup.id);
    const video2 = VideoFactory.createReady(videoGroup.id);
    
    // Create milestones for each video
    const milestone1 = MilestoneFactory.createQuiz(video1.id!, 30);
    const milestone2 = MilestoneFactory.createQuiz(video1.id!, 60);
    const milestone3 = MilestoneFactory.createQuiz(video2.id!, 45);
    
    // Create questions for each milestone
    const questions1 = QuestionFactory.createMixedTypes(milestone1.id!);
    const questions2 = QuestionFactory.createMixedTypes(milestone2.id!);
    const questions3 = QuestionFactory.createMixedTypes(milestone3.id!);
    
    return {
      teacher,
      lesson,
      videoGroup,
      videos: [video1, video2],
      milestones: [milestone1, milestone2, milestone3],
      questions: [...questions1, ...questions2, ...questions3]
    };
  }

  static async createStudentProgress() {
    const student = await UserFactory.createStudent();
    const { lesson, videos, milestones } = await this.createCompleteLesson();
    
    // Create enrollment
    const enrollment = {
      id: uuidv4(),
      studentId: student.id!,
      lessonId: lesson.id!,
      enrolledAt: new Date(),
      status: 'ACTIVE'
    };
    
    // Create lesson progress
    const lessonProgress = {
      id: uuidv4(),
      studentId: student.id!,
      lessonId: lesson.id!,
      progress: 0.5,
      completedAt: null,
      lastAccessedAt: new Date()
    };
    
    // Create video session
    const videoSession = {
      id: uuidv4(),
      userId: student.id!,
      videoId: videos[0].id!,
      startTime: new Date(),
      lastPosition: 45,
      totalWatchTime: 45,
      completed: false
    };
    
    // Create milestone progress
    const milestoneProgress = {
      id: uuidv4(),
      userId: student.id!,
      milestoneId: milestones[0].id!,
      completed: true,
      score: 0.8,
      attempts: 1,
      completedAt: new Date()
    };
    
    return {
      student,
      enrollment,
      lessonProgress,
      videoSession,
      milestoneProgress
    };
  }
}

/**
 * Utility to reset factory counters
 */
export function resetFactories() {
  UserFactory['counter'] = 0;
  LessonFactory['counter'] = 0;
  VideoFactory['counter'] = 0;
  MilestoneFactory['counter'] = 0;
  QuestionFactory['counter'] = 0;
}