const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testMeetingsEndpoint() {
  try {
    console.log('🧪 Testing Meetings Endpoints\n');

    // First, let's try to login to get a valid token
    console.log('1. Getting auth token...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'player1@test.com',
      password: 'Player123!'
    });

    if (loginResponse.status !== 200) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    const token = loginResponse.data.accessToken;
    console.log('✅ Login successful');
    console.log('📋 User Info:', {
      email: loginResponse.data.user.email,
      role: loginResponse.data.user.role,
      id: loginResponse.data.user.id
    });

    // Test the admin-only meetings endpoint (should fail for player)
    console.log('\n2. Testing admin-only /api/meetings endpoint (should fail for player)...');
    try {
      const adminMeetingsResponse = await axios.get(`${BASE_URL}/api/meetings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('❌ Unexpected success - player should not access admin endpoint');
    } catch (error) {
      if (error.response && error.response.status === 403) {
        console.log('✅ Correctly blocked - 403 Forbidden for player role');
        console.log('📝 Error message:', error.response.data.error);
      } else {
        console.log('❌ Unexpected error:', error.response?.status, error.response?.data);
      }
    }

    // Test the user-specific /my/meetings endpoint (should work)
    console.log('\n3. Testing user-specific /api/meetings/my/meetings endpoint...');
    try {
      const myMeetingsResponse = await axios.get(`${BASE_URL}/api/meetings/my/meetings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ My meetings endpoint works!');
      console.log('📊 Response:', {
        status: myMeetingsResponse.status,
        meetingsCount: myMeetingsResponse.data.meetings?.length || 0,
        pagination: myMeetingsResponse.data.pagination
      });
      
      if (myMeetingsResponse.data.meetings && myMeetingsResponse.data.meetings.length > 0) {
        console.log('📅 Sample meeting:', {
          id: myMeetingsResponse.data.meetings[0].id,
          status: myMeetingsResponse.data.meetings[0].status,
          coach_name: myMeetingsResponse.data.meetings[0].coach_name,
          player_name: myMeetingsResponse.data.meetings[0].player_name,
          my_role: myMeetingsResponse.data.meetings[0].my_role
        });
      }
    } catch (error) {
      console.log('❌ My meetings endpoint failed:', error.response?.status, error.response?.data);
    }

    // Test with query parameters
    console.log('\n4. Testing /api/meetings/my/meetings with status filter...');
    try {
      const filteredMeetingsResponse = await axios.get(`${BASE_URL}/api/meetings/my/meetings?status=scheduled&upcoming=true`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Filtered meetings endpoint works!');
      console.log('📊 Scheduled/upcoming meetings:', filteredMeetingsResponse.data.meetings?.length || 0);
    } catch (error) {
      console.log('❌ Filtered meetings failed:', error.response?.status, error.response?.data);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('📋 Response data:', error.response.data);
    }
  }
}

testMeetingsEndpoint();
