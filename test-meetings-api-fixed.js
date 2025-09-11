const axios = require('axios');

async function testMeetingsAPI() {
  try {
    // Get admin token
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'admin@footballmarketplace.com',
      password: 'Admin123!'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Admin login successful');
    
    // Test meetings endpoint
    const meetingsResponse = await axios.get('http://localhost:3000/api/meetings', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Meetings API Response:');
    console.log(JSON.stringify(meetingsResponse.data, null, 2));
    
    // Test single meeting if any exist
    if (meetingsResponse.data.meetings && meetingsResponse.data.meetings.length > 0) {
      const firstMeeting = meetingsResponse.data.meetings[0];
      const singleMeetingResponse = await axios.get(`http://localhost:3000/api/meetings/${firstMeeting.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('✅ Single Meeting API Response:');
      console.log(JSON.stringify(singleMeetingResponse.data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testMeetingsAPI();
