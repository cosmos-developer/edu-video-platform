import axios from 'axios'

async function testSession() {
  try {
    // First login as student
    const loginResponse = await axios.post('http://localhost:3000/api/v1/auth/login', {
      email: 'student@example.com',
      password: 'Demo123!'
    })
    
    console.log('Login response data:', loginResponse.data.data)
    const accessToken = loginResponse.data.data?.tokens?.accessToken || loginResponse.data.data?.accessToken
    console.log('✅ Login successful')
    
    if (!accessToken) {
      console.error('No access token received!')
      return
    }
    
    // Decode the token to see what's in it
    const tokenParts = accessToken.split('.')
    const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString())
    console.log('Token payload:', payload)
    
    // Now try to get session for the video
    const videoId = 'cme33hmyb000bxgonc1t7lrrh'
    
    try {
      const sessionResponse = await axios.get(
        `http://localhost:3000/api/v1/sessions/video/${videoId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      )
      
      console.log('✅ Session fetched successfully:', sessionResponse.data)
    } catch (sessionError: any) {
      console.error('❌ Session fetch error:', {
        status: sessionError.response?.status,
        data: sessionError.response?.data,
        message: sessionError.message
      })
    }
    
  } catch (error: any) {
    console.error('❌ Login error:', error.response?.data || error.message)
  }
}

testSession()