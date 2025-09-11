const axios = require('axios');

async function testMeetingsAPIResponse() {
  try {
    // Get admin token
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'admin@footballmarketplace.com',
      password: 'Admin123!'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Admin login successful');
    
    // Test meetings endpoint with detailed field inspection
    const meetingsResponse = await axios.get('http://localhost:3000/api/meetings', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Meetings API Response Structure:');
    console.log('Response keys:', Object.keys(meetingsResponse.data));
    
    if (meetingsResponse.data.meetings && meetingsResponse.data.meetings.length > 0) {
      console.log('First meeting keys:', Object.keys(meetingsResponse.data.meetings[0]));
      console.log('First meeting values:');
      for (const [key, value] of Object.entries(meetingsResponse.data.meetings[0])) {
        console.log(`  ${key}: ${value} (type: ${typeof value})`);
      }
    }
    
    console.log('\nResponse JSON:');
    console.log(JSON.stringify(meetingsResponse.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testMeetingsAPIResponse();
