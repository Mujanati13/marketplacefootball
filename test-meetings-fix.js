const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function createTestUserAndLogin() {
  try {
    console.log('🧪 Creating Test User for Meetings Test\n');

    // Create a new test user
    console.log('1. Creating test user...');
    const timestamp = Date.now();
    const testEmail = `meetingtest${timestamp}@example.com`;
    const testPassword = 'MeetingTest123!';

    const registerResponse = await axios.post(`${BASE_URL}/api/auth/register`, {
      name: 'Meeting Test User',
      email: testEmail,
      password: testPassword,
      role: 'player'
    });

    if (registerResponse.status !== 201) {
      throw new Error(`Registration failed: ${registerResponse.status}`);
    }

    console.log('✅ Test user created successfully');
    console.log('📋 User:', {
      email: testEmail,
      password: testPassword,
      role: 'player'
    });

    // Now test the meetings endpoints
    console.log('\n2. Testing login...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: testEmail,
      password: testPassword
    });

    const token = loginResponse.data.accessToken;
    console.log('✅ Login successful');

    // Test meetings endpoints
    console.log('\n3. Testing meetings endpoints...');
    
    // Test admin endpoint (should fail)
    try {
      await axios.get(`${BASE_URL}/api/meetings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('❌ Admin endpoint should have failed');
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('✅ Admin endpoint correctly blocked (403)');
      } else {
        console.log('❌ Unexpected error on admin endpoint:', error.response?.status);
      }
    }

    // Test user endpoint (should work)
    try {
      const myMeetingsResponse = await axios.get(`${BASE_URL}/api/meetings/my/meetings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('✅ User meetings endpoint works!');
      console.log('📊 Response status:', myMeetingsResponse.status);
      console.log('📊 Meetings count:', myMeetingsResponse.data.meetings?.length || 0);
    } catch (error) {
      console.log('❌ User meetings endpoint failed:', error.response?.status, error.response?.data);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('📋 Response:', error.response.status, error.response.data);
    }
  }
}

createTestUserAndLogin();
