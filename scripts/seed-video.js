const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedVideoData() {
  try {
    console.log('🎬 Seeding video data...');
    
    // Find or create a teacher user
    let teacher = await prisma.user.findFirst({
      where: { role: 'TEACHER' }
    });
    
    if (!teacher) {
      console.log('Creating teacher user...');
      const bcrypt = require('bcrypt');
      teacher = await prisma.user.create({
        data: {
          email: 'teacher@example.com',
          passwordHash: await bcrypt.hash('Demo123!', 10),
          firstName: 'Demo',
          lastName: 'Teacher',
          role: 'TEACHER',
          status: 'ACTIVE'
        }
      });
    }
    
    // Create a lesson
    const lesson = await prisma.lesson.upsert({
      where: { 
        id: 'demo-lesson-1' 
      },
      update: {},
      create: {
        id: 'demo-lesson-1',
        title: 'Introduction to JavaScript',
        description: 'Learn the fundamentals of JavaScript programming',
        createdById: teacher.id,
        order: 1,
        status: 'PUBLISHED'
      }
    });
    
    console.log('✓ Created lesson:', lesson.title);
    
    // Create a video group
    const videoGroup = await prisma.videoGroup.upsert({
      where: { 
        id: 'demo-group-1' 
      },
      update: {},
      create: {
        id: 'demo-group-1',
        title: 'JavaScript Basics',
        description: 'Core concepts of JavaScript',
        lessonId: lesson.id,
        order: 1
      }
    });
    
    console.log('✓ Created video group:', videoGroup.title);
    
    // Create a video
    const video = await prisma.video.upsert({
      where: { 
        id: 'demo-video-1' 
      },
      update: {},
      create: {
        id: 'demo-video-1',
        title: 'Variables and Data Types',
        description: 'Understanding JavaScript variables and data types',
        videoGroupId: videoGroup.id,
        duration: 600, // 10 minutes
        order: 1,
        status: 'READY',
        // Using a sample video path - replace with actual video
        filePath: 'videos/demo-video-1.mp4',
        fileName: 'demo-video-1.mp4',
        mimeType: 'video/mp4',
        size: BigInt(10485760), // 10MB
      }
    });
    
    console.log('✓ Created video:', video.title);
    
    // Create milestones with questions
    const milestones = [
      {
        id: 'milestone-1',
        videoId: video.id,
        timestamp: 30, // 30 seconds
        type: 'PAUSE',
        title: 'Introduction Complete',
        description: 'You\'ve completed the introduction section',
        order: 1
      },
      {
        id: 'milestone-2',
        videoId: video.id,
        timestamp: 120, // 2 minutes
        type: 'QUIZ',
        title: 'Quick Check: Variables',
        description: 'Test your understanding of variables',
        order: 2,
        questions: [
          {
            type: 'MULTIPLE_CHOICE',
            text: 'Which keyword is used to declare a constant in JavaScript?',
            questionData: {
              options: ['var', 'let', 'const', 'constant'],
              correctAnswer: 'const'
            },
            explanation: 'The const keyword is used to declare constants that cannot be reassigned.'
          },
          {
            type: 'TRUE_FALSE',
            text: 'JavaScript is a statically typed language.',
            questionData: {
              correctAnswer: false
            },
            explanation: 'JavaScript is dynamically typed, meaning variable types are determined at runtime.'
          }
        ]
      },
      {
        id: 'milestone-3',
        videoId: video.id,
        timestamp: 300, // 5 minutes
        type: 'CHECKPOINT',
        title: 'Midpoint Checkpoint',
        description: 'You\'re halfway through the lesson!',
        order: 3
      },
      {
        id: 'milestone-4',
        videoId: video.id,
        timestamp: 480, // 8 minutes
        type: 'QUIZ',
        title: 'Data Types Quiz',
        description: 'Check your understanding of JavaScript data types',
        order: 4,
        questions: [
          {
            type: 'MULTIPLE_CHOICE',
            text: 'Which of the following is NOT a primitive data type in JavaScript?',
            questionData: {
              options: ['string', 'number', 'array', 'boolean'],
              correctAnswer: 'array'
            },
            explanation: 'Arrays are objects in JavaScript, not primitive data types.'
          },
          {
            type: 'SHORT_ANSWER',
            text: 'What is the result of typeof null in JavaScript?',
            questionData: {
              correctAnswers: ['object', '"object"']
            },
            explanation: 'This is a well-known quirk in JavaScript - typeof null returns "object".'
          }
        ]
      }
    ];
    
    for (const milestoneData of milestones) {
      const { questions, ...milestone } = milestoneData;
      
      // Create or update milestone with nested questions
      const createdMilestone = await prisma.milestone.upsert({
        where: { id: milestone.id },
        update: {
          ...milestone,
          questions: questions ? {
            deleteMany: {}, // Clear existing questions
            create: questions.map((q, i) => ({
              type: q.type,
              text: q.text,
              questionData: q.questionData,
              explanation: q.explanation,
              order: i + 1,
              status: 'PUBLISHED',
              createdBy: teacher.id
            }))
          } : undefined
        },
        create: {
          ...milestone,
          questions: questions ? {
            create: questions.map((q, i) => ({
              type: q.type,
              text: q.text,
              questionData: q.questionData,
              explanation: q.explanation,
              order: i + 1,
              status: 'PUBLISHED',
              createdBy: teacher.id
            }))
          } : undefined
        },
        include: {
          questions: true
        }
      });
      
      console.log(`✓ Created milestone: ${createdMilestone.title} at ${createdMilestone.timestamp}s`);
      
      if (createdMilestone.questions && createdMilestone.questions.length > 0) {
        for (const question of createdMilestone.questions) {
          console.log(`  ✓ Added question: ${question.text.substring(0, 50)}...`);
        }
      }
    }
    
    // Create a second video for testing
    const video2 = await prisma.video.upsert({
      where: { 
        id: 'demo-video-2' 
      },
      update: {},
      create: {
        id: 'demo-video-2',
        title: 'Functions and Scope',
        description: 'Learn about JavaScript functions and scope',
        videoGroupId: videoGroup.id,
        duration: 720, // 12 minutes
        order: 2,
        status: 'READY',
        filePath: 'videos/demo-video-2.mp4',
        fileName: 'demo-video-2.mp4',
        mimeType: 'video/mp4',
        size: BigInt(12582912), // 12MB
      }
    });
    
    console.log('✓ Created second video:', video2.title);
    
    // Add a milestone to the second video
    await prisma.milestone.upsert({
      where: { id: 'milestone-5' },
      update: {},
      create: {
        id: 'milestone-5',
        videoId: video2.id,
        timestamp: 60,
        type: 'QUIZ',
        title: 'Function Basics',
        description: 'Test your understanding of functions',
        order: 1
      }
    });
    
    // Add a question to this milestone
    await prisma.question.upsert({
      where: { id: 'question-5' },
      update: {},
      create: {
        id: 'question-5',
        milestoneId: 'milestone-5',
        type: 'MULTIPLE_CHOICE',
        text: 'What keyword is used to define a function in JavaScript?',
        questionData: {
          options: ['func', 'function', 'def', 'fn'],
          correctAnswer: 'function'
        },
        explanation: 'The function keyword is used to define functions in JavaScript.',
        order: 1,
        status: 'PUBLISHED',
        createdBy: teacher.id
      }
    });
    
    console.log('✅ Video data seeded successfully!');
    console.log('\nYou can now test with:');
    console.log('  - Lesson: Introduction to JavaScript');
    console.log('  - Video 1: Variables and Data Types (with 4 milestones)');
    console.log('  - Video 2: Functions and Scope (with 1 milestone)');
    console.log('\nMilestone timestamps:');
    console.log('  - 0:30 - Info milestone');
    console.log('  - 2:00 - Quiz (2 questions)');
    console.log('  - 5:00 - Checkpoint');
    console.log('  - 8:00 - Quiz (2 questions)');
    
  } catch (error) {
    console.error('❌ Error seeding video data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedVideoData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });