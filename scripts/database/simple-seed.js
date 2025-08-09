const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function simpleSeed() {
  try {
    console.log('🎬 Creating simple test data...');
    
    // Get teacher user
    const teacher = await prisma.user.findFirst({
      where: { role: 'TEACHER' }
    });
    
    if (!teacher) {
      console.error('No teacher user found. Run the user seed first.');
      return;
    }
    
    // Create lesson
    const lesson = await prisma.lesson.upsert({
      where: { id: 'test-lesson-1' },
      update: {},
      create: {
        id: 'test-lesson-1',
        title: 'Test Lesson',
        description: 'A simple test lesson',
        createdById: teacher.id,
        order: 1,
        status: 'PUBLISHED'
      }
    });
    
    // Create video group
    const videoGroup = await prisma.videoGroup.upsert({
      where: { id: 'test-group-1' },
      update: {},
      create: {
        id: 'test-group-1',
        title: 'Test Video Group',
        description: 'A test video group',
        lessonId: lesson.id,
        order: 1
      }
    });
    
    // Create video
    const video = await prisma.video.upsert({
      where: { id: 'test-video-1' },
      update: {},
      create: {
        id: 'test-video-1',
        title: 'Test Video',
        description: 'A test video with milestones',
        videoGroupId: videoGroup.id,
        duration: 300, // 5 minutes
        order: 1,
        status: 'READY',
        filePath: 'videos/test-video.mp4',
        fileName: 'test-video.mp4',
        mimeType: 'video/mp4'
      }
    });
    
    // Create milestones
    const milestone1 = await prisma.milestone.upsert({
      where: { id: 'test-milestone-1' },
      update: {},
      create: {
        id: 'test-milestone-1',
        videoId: video.id,
        timestamp: 60, // 1 minute
        type: 'PAUSE',
        title: 'First Milestone',
        description: 'This is the first milestone',
        order: 1
      }
    });
    
    const milestone2 = await prisma.milestone.upsert({
      where: { id: 'test-milestone-2' },
      update: {},
      create: {
        id: 'test-milestone-2',
        videoId: video.id,
        timestamp: 120, // 2 minutes
        type: 'QUIZ',
        title: 'Quiz Milestone',
        description: 'Test your knowledge',
        order: 2
      }
    });
    
    // Create questions for the quiz milestone
    await prisma.question.upsert({
      where: { id: 'test-question-1' },
      update: {},
      create: {
        id: 'test-question-1',
        milestoneId: milestone2.id,
        type: 'MULTIPLE_CHOICE',
        text: 'What color is the sky?',
        questionData: {
          options: ['Red', 'Blue', 'Green', 'Yellow'],
          correctAnswer: 'Blue'
        },
        explanation: 'The sky appears blue due to light scattering',
        status: 'PUBLISHED',
        createdBy: teacher.id
      }
    });
    
    await prisma.question.upsert({
      where: { id: 'test-question-2' },
      update: {},
      create: {
        id: 'test-question-2',
        milestoneId: milestone2.id,
        type: 'TRUE_FALSE',
        text: 'The Earth is round.',
        questionData: {
          correctAnswer: true
        },
        explanation: 'The Earth is roughly spherical in shape.',
        status: 'PUBLISHED',
        createdBy: teacher.id
      }
    });
    
    console.log('✅ Simple test data created successfully!');
    console.log('\nCreated:');
    console.log('- Lesson: Test Lesson');
    console.log('- Video: Test Video (5 minutes)');
    console.log('- Milestone 1: First Milestone (1:00)');
    console.log('- Milestone 2: Quiz Milestone (2:00) - with 2 questions');
    console.log('\nVideo ID:', video.id);
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

simpleSeed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });