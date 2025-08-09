import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function enrollStudent() {
  try {
    const videoId = 'cme33hmyb000bxgonc1t7lrrh'
    const studentEmail = 'student@example.com'
    
    // Get student user
    const student = await prisma.user.findUnique({
      where: { email: studentEmail }
    })
    
    if (!student) {
      console.log('Student not found')
      return
    }
    
    // Get video and its lesson
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: {
        videoGroup: {
          include: {
            lesson: true
          }
        }
      }
    })
    
    if (!video) {
      console.log('Video not found')
      return
    }
    
    const lessonId = video.videoGroup.lesson.id
    
    // Check if already enrolled
    const existingProgress = await prisma.studentProgress.findFirst({
      where: {
        studentId: student.id,
        lessonId: lessonId
      }
    })
    
    if (existingProgress) {
      console.log('Student already enrolled in lesson')
      return
    }
    
    // Create enrollment
    const progress = await prisma.studentProgress.create({
      data: {
        studentId: student.id,
        lessonId: lessonId,
        isCompleted: false,
        completionPercent: 0,
        totalTimeSpent: 0,
        totalMilestones: 0,
        completedMilestones: 0,
        averageScore: 0,
        totalAttempts: 0,
        successfulAttempts: 0
      }
    })
    
    console.log('✅ Student enrolled successfully!')
    console.log('Progress record:', {
      id: progress.id,
      studentId: progress.studentId,
      lessonId: progress.lessonId
    })
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

enrollStudent()