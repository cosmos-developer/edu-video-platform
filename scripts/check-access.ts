import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkAccess() {
  try {
    const videoId = 'cme33hmyb000bxgonc1t7lrrh'
    const userEmail = 'student@example.com' // or whichever user you're testing with
    
    // Get user
    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    })
    
    if (!user) {
      console.log('User not found')
      return
    }
    
    console.log('User:', { id: user.id, email: user.email, role: user.role })
    
    // Check video and its lesson
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: {
        videoGroup: {
          include: {
            lesson: {
              include: {
                studentProgress: {
                  where: { studentId: user.id }
                }
              }
            }
          }
        }
      }
    })
    
    if (!video) {
      console.log('Video not found')
      return
    }
    
    console.log('Video:', { 
      id: video.id, 
      title: video.title,
      duration: video.duration 
    })
    console.log('Lesson:', {
      id: video.videoGroup.lesson.id,
      title: video.videoGroup.lesson.title,
      createdById: video.videoGroup.lesson.createdById
    })
    
    // Check access
    const isCreator = video.videoGroup.lesson.createdById === user.id
    const isEnrolled = video.videoGroup.lesson.studentProgress.length > 0
    
    console.log('Access check:')
    console.log('- Is creator:', isCreator)
    console.log('- Is enrolled:', isEnrolled)
    console.log('- Has access:', isCreator || isEnrolled)
    
    // Check existing session
    const session = await prisma.studentSession.findFirst({
      where: {
        videoId: videoId,
        studentId: user.id
      }
    })
    
    if (session) {
      console.log('Existing session:', {
        id: session.id,
        status: session.status,
        currentPosition: session.currentPosition
      })
    } else {
      console.log('No existing session')
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkAccess()