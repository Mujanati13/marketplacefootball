const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testPlayersCoachesEndpoints() {
  try {
    console.log('🧪 Testing Players and Coaches Endpoints\n');

    // Test players endpoint (should be public)
    console.log('1. Testing /api/players endpoint...');
    try {
      const playersResponse = await axios.get(`${BASE_URL}/api/players?limit=5`);
      console.log('✅ Players endpoint works!');
      console.log('📊 Response:', {
        status: playersResponse.status,
        playersCount: playersResponse.data.players?.length || 0,
        hasData: playersResponse.data.players && playersResponse.data.players.length > 0
      });
      
      if (playersResponse.data.players && playersResponse.data.players.length > 0) {
        console.log('👤 Sample player:', {
          id: playersResponse.data.players[0].user_id,
          name: `${playersResponse.data.players[0].first_name} ${playersResponse.data.players[0].last_name}`,
          email: playersResponse.data.players[0].email
        });
      }
    } catch (error) {
      console.log('❌ Players endpoint failed:', error.response?.status, error.response?.data);
    }

    // Test coaches endpoint (should be public)
    console.log('\n2. Testing /api/coaches endpoint...');
    try {
      const coachesResponse = await axios.get(`${BASE_URL}/api/coaches?limit=5`);
      console.log('✅ Coaches endpoint works!');
      console.log('📊 Response:', {
        status: coachesResponse.status,
        coachesCount: coachesResponse.data.coaches?.length || 0,
        hasData: coachesResponse.data.coaches && coachesResponse.data.coaches.length > 0
      });
      
      if (coachesResponse.data.coaches && coachesResponse.data.coaches.length > 0) {
        console.log('👤 Sample coach:', {
          id: coachesResponse.data.coaches[0].user_id,
          name: `${coachesResponse.data.coaches[0].first_name} ${coachesResponse.data.coaches[0].last_name}`,
          email: coachesResponse.data.coaches[0].email
        });
      }
    } catch (error) {
      console.log('❌ Coaches endpoint failed:', error.response?.status, error.response?.data);
    }

    // Test admin users endpoint with regular user (should fail)
    console.log('\n3. Testing admin endpoint accessibility...');
    
    // Create a test user and try admin endpoint
    const timestamp = Date.now();
    const testEmail = `testaccess${timestamp}@example.com`;
    const testPassword = 'TestAccess123!';

    try {
      // Register test user
      await axios.post(`${BASE_URL}/api/auth/register`, {
        name: 'Test Access User',
        email: testEmail,
        password: testPassword,
        role: 'player'
      });

      // Login to get token
      const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: testEmail,
        password: testPassword
      });

      const token = loginResponse.data.accessToken;

      // Try admin endpoint (should fail)
      try {
        await axios.get(`${BASE_URL}/api/admin/users`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('❌ Admin endpoint should have been blocked');
      } catch (error) {
        if (error.response?.status === 403) {
          console.log('✅ Admin endpoint correctly blocked for regular user');
        } else {
          console.log('❌ Unexpected error on admin endpoint:', error.response?.status);
        }
      }

    } catch (error) {
      console.log('❌ Failed to test admin endpoint:', error.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('📋 Response:', error.response.status, error.response.data);
    }
  }
}

testPlayersCoachesEndpoints();
