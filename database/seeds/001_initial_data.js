"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Starting database seeding...');
    const systemConfigs = [
        {
            key: 'app.name',
            value: { name: 'Interactive Learning Platform' },
            description: 'Application name',
            category: 'general',
            isPublic: true
        },
        {
            key: 'app.version',
            value: { version: '1.0.0' },
            description: 'Application version',
            category: 'general',
            isPublic: true
        },
        {
            key: 'video.maxFileSize',
            value: { maxSize: 2147483648 },
            description: 'Maximum video file size',
            category: 'video',
            isPublic: false
        },
        {
            key: 'video.allowedFormats',
            value: {
                formats: ['mp4', 'webm', 'mov', 'avi'],
                codecs: ['h264', 'vp9', 'vp8']
            },
            description: 'Allowed video formats and codecs',
            category: 'video',
            isPublic: true
        },
        {
            key: 'ai.defaultProvider',
            value: { provider: 'OPENAI' },
            description: 'Default AI provider for question generation',
            category: 'ai',
            isPublic: false
        },
        {
            key: 'grading.defaultRetryLimit',
            value: { retryLimit: 3 },
            description: 'Default number of retry attempts for questions',
            category: 'grading',
            isPublic: false
        },
        {
            key: 'grading.passingThreshold',
            value: { threshold: 0.7 },
            description: 'Default passing threshold (70%)',
            category: 'grading',
            isPublic: false
        },
        {
            key: 'analytics.enableTracking',
            value: { enabled: true },
            description: 'Enable analytics tracking',
            category: 'analytics',
            isPublic: false
        },
        {
            key: 'session.timeoutMinutes',
            value: { timeout: 30 },
            description: 'Session timeout in minutes',
            category: 'session',
            isPublic: false
        },
        {
            key: 'features.enableAIGeneration',
            value: { enabled: true },
            description: 'Enable AI question generation',
            category: 'features',
            isPublic: false
        }
    ];
    console.log('Creating system configurations...');
    for (const config of systemConfigs) {
        await prisma.systemConfig.upsert({
            where: { key: config.key },
            update: config,
            create: config
        });
    }
    const passwordHash = await bcrypt_1.default.hash('Demo123!', 10);
    const adminUser = await prisma.user.upsert({
        where: { email: 'admin@example.com' },
        update: {},
        create: {
            email: 'admin@example.com',
            firstName: 'System',
            lastName: 'Administrator',
            role: 'ADMIN',
            status: 'ACTIVE',
            passwordHash,
            emailVerified: new Date()
        }
    });
    const teacherUser = await prisma.user.upsert({
        where: { email: 'teacher@example.com' },
        update: {},
        create: {
            email: 'teacher@example.com',
            firstName: 'Demo',
            lastName: 'Teacher',
            role: 'TEACHER',
            status: 'ACTIVE',
            passwordHash,
            emailVerified: new Date()
        }
    });
    const studentUser = await prisma.user.upsert({
        where: { email: 'student@example.com' },
        update: {},
        create: {
            email: 'student@example.com',
            firstName: 'Demo',
            lastName: 'Student',
            role: 'STUDENT',
            status: 'ACTIVE',
            passwordHash,
            emailVerified: new Date()
        }
    });
    console.log('Created demo users:', {
        admin: adminUser.email,
        teacher: teacherUser.email,
        student: studentUser.email
    });
    await prisma.userPreference.upsert({
        where: { userId: studentUser.id },
        update: {},
        create: {
            userId: studentUser.id,
            autoplay: true,
            playbackSpeed: 1.0,
            subtitles: false,
            theme: 'light',
            language: 'en',
            emailNotifications: true,
            progressNotifications: true,
            allowAnalytics: true
        }
    });
    const aiConfig = await prisma.aIConfiguration.upsert({
        where: { id: 'default-openai' },
        update: {},
        create: {
            id: 'default-openai',
            provider: 'OPENAI',
            name: 'Default OpenAI Configuration',
            model: 'gpt-3.5-turbo',
            parameters: {
                temperature: 0.7,
                maxTokens: 2000,
                topP: 1.0,
                frequencyPenalty: 0.0,
                presencePenalty: 0.0
            },
            isActive: true,
            rateLimit: 60,
            maxTokens: 4000,
            costPerToken: 0.0000015
        }
    });
    console.log('Created AI configuration:', aiConfig.name);
    const demoLesson = await prisma.lesson.create({
        data: {
            title: 'Introduction to Interactive Learning',
            description: 'Learn how to use the interactive video platform effectively',
            status: 'PUBLISHED',
            order: 1,
            createdById: teacherUser.id,
            objectives: [
                'Understand the basics of interactive video learning',
                'Learn how to answer milestone questions',
                'Navigate the learning platform effectively'
            ],
            estimatedTime: 30,
            difficulty: 'beginner',
            tags: ['introduction', 'tutorial', 'basics'],
            publishedAt: new Date(),
            metadata: {
                category: 'Tutorial',
                isDemo: true
            }
        }
    });
    const videoGroup = await prisma.videoGroup.create({
        data: {
            lessonId: demoLesson.id,
            title: 'Getting Started',
            description: 'Introduction videos for new users',
            order: 1
        }
    });
    const demoVideo = await prisma.video.create({
        data: {
            videoGroupId: videoGroup.id,
            title: 'Welcome to Interactive Learning',
            description: 'A brief introduction to the platform features',
            order: 1,
            status: 'READY',
            gcsPath: 'demo/welcome-video.mp4',
            gcsUrl: 'https://storage.googleapis.com/demo-bucket/welcome-video.mp4',
            duration: 300,
            mimeType: 'video/mp4',
            thumbnailUrl: 'https://storage.googleapis.com/demo-bucket/welcome-thumbnail.jpg',
            metadata: {
                resolution: '1920x1080',
                bitrate: 2500,
                fps: 30
            },
            uploadedAt: new Date(),
            processedAt: new Date()
        }
    });
    const milestone1 = await prisma.milestone.create({
        data: {
            videoId: demoVideo.id,
            timestamp: 60.0,
            title: 'Platform Overview Check',
            description: 'Test your understanding of the platform overview',
            order: 1,
            isRequired: true,
            retryLimit: 3
        }
    });
    const milestone2 = await prisma.milestone.create({
        data: {
            videoId: demoVideo.id,
            timestamp: 180.0,
            title: 'Navigation Features Check',
            description: 'Verify you understand the navigation features',
            order: 2,
            isRequired: true,
            retryLimit: 3
        }
    });
    const question1 = await prisma.question.create({
        data: {
            milestoneId: milestone1.id,
            type: 'MULTIPLE_CHOICE',
            status: 'APPROVED',
            text: 'What is the main purpose of milestone questions in this platform?',
            explanation: 'Milestone questions ensure comprehension before allowing students to continue.',
            hints: [
                'Think about why the video pauses',
                'Consider the educational goal'
            ],
            difficulty: 'easy',
            questionData: {
                options: [
                    { id: '1', text: 'To pause the video randomly', isCorrect: false },
                    { id: '2', text: 'To ensure understanding before proceeding', isCorrect: true },
                    { id: '3', text: 'To make the video longer', isCorrect: false },
                    { id: '4', text: 'To test technical knowledge', isCorrect: false }
                ]
            },
            points: 1,
            passThreshold: 1.0,
            aiModel: 'gpt-3.5-turbo',
            aiPrompt: 'Generate a multiple choice question about milestone questions in educational videos',
            aiConfidence: 0.95
        }
    });
    const question2 = await prisma.question.create({
        data: {
            milestoneId: milestone2.id,
            type: 'TRUE_FALSE',
            status: 'APPROVED',
            text: 'Students can skip milestone questions if they find them too difficult.',
            explanation: 'Milestone questions are required and must be answered correctly to proceed.',
            hints: [
                'Think about the learning objectives',
                'Consider what happens when you answer incorrectly'
            ],
            difficulty: 'easy',
            questionData: {
                correctAnswer: false
            },
            points: 1,
            passThreshold: 1.0,
            aiModel: 'gpt-3.5-turbo',
            aiPrompt: 'Generate a true/false question about mandatory milestone questions',
            aiConfidence: 0.92
        }
    });
    console.log('Created demo lesson structure:', {
        lesson: demoLesson.title,
        videoGroup: videoGroup.title,
        video: demoVideo.title,
        milestones: 2,
        questions: 2
    });
    const studentProgress = await prisma.studentProgress.create({
        data: {
            studentId: studentUser.id,
            lessonId: demoLesson.id,
            isCompleted: false,
            completionPercent: 40.0,
            totalTimeSpent: 120,
            totalMilestones: 2,
            completedMilestones: 1,
            averageScore: 100.0,
            totalAttempts: 1,
            successfulAttempts: 1,
            progressData: {
                milestoneProgress: {
                    [milestone1.id]: {
                        completed: true,
                        attempts: 1,
                        score: 100,
                        timeSpent: 45
                    },
                    [milestone2.id]: {
                        completed: false,
                        attempts: 0,
                        score: 0,
                        timeSpent: 0
                    }
                },
                videoProgress: {
                    [demoVideo.id]: {
                        watchTime: 120,
                        completionPercentage: 40,
                        lastPosition: 120
                    }
                }
            }
        }
    });
    const studentSession = await prisma.studentSession.create({
        data: {
            studentId: studentUser.id,
            videoId: demoVideo.id,
            status: 'PAUSED',
            currentPosition: 120.0,
            lastMilestoneId: milestone1.id,
            completedMilestones: [milestone1.id],
            deviceInfo: {
                platform: 'Web',
                browser: 'Chrome',
                version: '91.0.4472.124',
                mobile: false,
                screenResolution: '1920x1080'
            },
            startedAt: new Date(Date.now() - 3600000),
            lastSeenAt: new Date(Date.now() - 1800000)
        }
    });
    const questionAttempt = await prisma.questionAttempt.create({
        data: {
            studentId: studentUser.id,
            questionId: question1.id,
            status: 'CORRECT',
            attemptNumber: 1,
            studentAnswer: { selectedOption: '2' },
            isCorrect: true,
            score: 1.0,
            timeSpent: 30,
            hintsUsed: [],
            feedback: 'Correct! Milestone questions ensure understanding.',
            submittedAt: new Date(Date.now() - 1800000)
        }
    });
    const grade = await prisma.grade.create({
        data: {
            studentId: studentUser.id,
            studentProgressId: studentProgress.id,
            totalPoints: 2,
            earnedPoints: 1,
            percentageScore: 50.0,
            status: 'IN_PROGRESS',
            totalAttempts: 1,
            remainingAttempts: 2,
            gradeBreakdown: {
                milestones: {
                    [milestone1.id]: {
                        totalPoints: 1,
                        earnedPoints: 1,
                        percentage: 100,
                        attempts: 1
                    },
                    [milestone2.id]: {
                        totalPoints: 1,
                        earnedPoints: 0,
                        percentage: 0,
                        attempts: 0
                    }
                },
                questionTypes: {
                    'MULTIPLE_CHOICE': {
                        totalQuestions: 1,
                        correctAnswers: 1,
                        averageScore: 100
                    },
                    'TRUE_FALSE': {
                        totalQuestions: 1,
                        correctAnswers: 0,
                        averageScore: 0
                    }
                },
                timeMetrics: {
                    totalTime: 30,
                    averageTimePerQuestion: 30,
                    efficiency: 0.85
                }
            }
        }
    });
    console.log('Created sample student progress and session data');
    const analyticsEvents = [
        {
            userId: studentUser.id,
            sessionId: studentSession.id,
            eventType: 'video_start',
            eventData: {
                videoId: demoVideo.id,
                position: 0,
                playbackSpeed: 1.0
            },
            context: {
                sessionId: studentSession.id,
                deviceType: 'desktop',
                browserName: 'Chrome',
                browserVersion: '91.0.4472.124',
                screenResolution: '1920x1080'
            },
            timestamp: new Date(Date.now() - 3600000)
        },
        {
            userId: studentUser.id,
            sessionId: studentSession.id,
            eventType: 'milestone_reached',
            eventData: {
                videoId: demoVideo.id,
                position: 60,
                milestoneId: milestone1.id
            },
            context: {
                sessionId: studentSession.id,
                deviceType: 'desktop',
                browserName: 'Chrome',
                browserVersion: '91.0.4472.124',
                screenResolution: '1920x1080'
            },
            timestamp: new Date(Date.now() - 3540000)
        },
        {
            userId: studentUser.id,
            sessionId: studentSession.id,
            eventType: 'question_attempt',
            eventData: {
                questionId: question1.id,
                questionType: 'MULTIPLE_CHOICE',
                attemptNumber: 1,
                correct: true,
                timeSpent: 30
            },
            context: {
                sessionId: studentSession.id,
                deviceType: 'desktop',
                browserName: 'Chrome',
                browserVersion: '91.0.4472.124',
                screenResolution: '1920x1080'
            },
            timestamp: new Date(Date.now() - 3510000)
        }
    ];
    for (const event of analyticsEvents) {
        await prisma.analyticsEvent.create({ data: event });
    }
    console.log('Created sample analytics events');
    await prisma.auditLog.create({
        data: {
            userId: teacherUser.id,
            action: 'CREATE',
            resource: 'lessons',
            resourceId: demoLesson.id,
            changes: {
                after: {
                    title: demoLesson.title,
                    status: 'PUBLISHED'
                }
            },
            metadata: {
                source: 'seed_script',
                reason: 'Initial demo content creation'
            }
        }
    });
    await prisma.auditLog.create({
        data: {
            userId: studentUser.id,
            action: 'LOGIN',
            resource: 'users',
            resourceId: studentUser.id,
            metadata: {
                source: 'seed_script',
                ipAddress: '127.0.0.1'
            }
        }
    });
    console.log('Created audit log entries');
    console.log('✅ Database seeding completed successfully!');
    console.log('\n📊 Seeding Summary:');
    console.log('- System configurations: 10');
    console.log('- Demo users: 3 (Admin, Teacher, Student)');
    console.log('- Demo lesson with video and milestones: 1');
    console.log('- Sample questions: 2');
    console.log('- Student progress tracking: Created');
    console.log('- Analytics events: 3');
    console.log('- Audit logs: 2');
    console.log('\n🔐 Demo Login Credentials:');
    console.log('Admin: admin@example.com / Demo123!');
    console.log('Teacher: teacher@example.com / Demo123!');
    console.log('Student: student@example.com / Demo123!');
}
main()
    .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=001_initial_data.js.map