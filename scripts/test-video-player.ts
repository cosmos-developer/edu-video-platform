#!/usr/bin/env tsx

import axios from 'axios'

const API_URL = 'http://localhost:3000/api/v1'

// Test credentials
const testUser = {
  email: 'student@example.com',
  password: 'Demo123!'
}

// Test video ID from the database
const testVideoId = 'cme33hmyb000bxgonc1t7lrrh'

async function login() {
  try {
    const response = await axios.post(`${API_URL}/auth/login`, testUser)
    const token = response.data.data.tokens.accessToken
    console.log('Token received:', token ? '✓' : '✗')
    return token
  } catch (error: any) {
    console.error('Login failed:', error.response?.data || error.message)
    throw error
  }
}

async function testVideoPlayerFlow(token: string) {
  const headers = { Authorization: `Bearer ${token}` }
  let sessionId: string = ''
  
  console.log('\n=== Testing Video Player Flow ===\n')
  
  try {
    // 1. Get video details
    console.log('1. Getting video details...')
    const videoResponse = await axios.get(`${API_URL}/videos/${testVideoId}`, { headers })
    console.log('✓ Video loaded:', videoResponse.data.data.title)
    console.log('  Milestones:', videoResponse.data.data.milestones?.length || 0)
    
    // 2. Get or create session
    console.log('\n2. Getting session for video...')
    try {
      const sessionResponse = await axios.get(`${API_URL}/sessions/video/${testVideoId}`, { headers })
      const session = sessionResponse.data.data
      if (session) {
        sessionId = session.id
        console.log('✓ Found existing session:', sessionId)
        console.log('  Status:', session.status)
        console.log('  Current position:', session.currentPosition, 'seconds')
      }
    } catch (error) {
      console.log('  No existing session found')
    }
    
    // 3. Start session if needed
    if (!sessionId) {
      console.log('\n3. Starting new session...')
      const startResponse = await axios.post(`${API_URL}/sessions/start`, 
        { videoId: testVideoId }, 
        { headers }
      )
      const session = startResponse.data.data
      if (session) {
        sessionId = session.id
        console.log('✓ Session started:', sessionId)
      } else {
        console.log('  Session creation returned null (expected for new videos)')
        // Create session through GET endpoint
        const getResponse = await axios.get(`${API_URL}/sessions/video/${testVideoId}`, { headers })
        sessionId = getResponse.data.data.id
        console.log('✓ Session created via GET:', sessionId)
      }
    }
    
    // 4. Update progress
    console.log('\n4. Updating progress...')
    const progressResponse = await axios.put(
      `${API_URL}/sessions/${sessionId}/progress`,
      { currentTime: 30, totalWatchTime: 30 },
      { headers }
    )
    console.log('✓ Progress updated to 30 seconds')
    
    // 5. Mark milestone (if video has milestones)
    const video = videoResponse.data.data
    if (video.milestones && video.milestones.length > 0) {
      const firstMilestone = video.milestones[0]
      console.log('\n5. Marking milestone as reached...')
      try {
        await axios.post(
          `${API_URL}/sessions/${sessionId}/milestone`,
          { 
            milestoneId: firstMilestone.id,
            timestamp: firstMilestone.timestamp
          },
          { headers }
        )
        console.log('✓ Milestone reached:', firstMilestone.title)
        
        // 6. Submit answer if milestone has questions
        if (firstMilestone.questions && firstMilestone.questions.length > 0) {
          const firstQuestion = firstMilestone.questions[0]
          console.log('\n6. Submitting answer to question...')
          
          // Determine answer based on question type
          let answer = 'Test answer'
          if (firstQuestion.type === 'MULTIPLE_CHOICE') {
            const options = firstQuestion.questionData?.options || []
            answer = options[0] || 'Option A'
          } else if (firstQuestion.type === 'TRUE_FALSE') {
            answer = 'true'
          }
          
          const answerResponse = await axios.post(
            `${API_URL}/sessions/${sessionId}/question`,
            {
              questionId: firstQuestion.id,
              milestoneId: firstMilestone.id,
              answer: answer
            },
            { headers }
          )
          const result = answerResponse.data.data
          console.log('✓ Answer submitted')
          console.log('  Correct:', result.isCorrect)
          console.log('  Score:', result.score)
          if (result.explanation) {
            console.log('  Explanation:', result.explanation)
          }
        }
      } catch (error: any) {
        if (error.response?.data?.error === 'Milestone not found') {
          console.log('  Milestone not found for this video')
        } else {
          throw error
        }
      }
    }
    
    // 7. Complete session
    console.log('\n7. Completing session...')
    const completeResponse = await axios.put(
      `${API_URL}/sessions/${sessionId}/complete`,
      { finalTime: 60, totalWatchTime: 60 },
      { headers }
    )
    console.log('✓ Session completed')
    console.log('  Final status:', completeResponse.data.data.status)
    
    console.log('\n=== All Video Player Flows Working! ===\n')
    
  } catch (error: any) {
    console.error('\n✗ Error in video player flow:')
    console.error('  Status:', error.response?.status)
    console.error('  Message:', error.response?.data?.error || error.message)
    console.error('  Details:', error.response?.data?.details)
    process.exit(1)
  }
}

async function main() {
  try {
    console.log('Logging in as student...')
    const token = await login()
    console.log('✓ Logged in successfully')
    
    await testVideoPlayerFlow(token)
    
    console.log('\n✅ All tests passed!')
  } catch (error) {
    console.error('Test failed:', error)
    process.exit(1)
  }
}

main()