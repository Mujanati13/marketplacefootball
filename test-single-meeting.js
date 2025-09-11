const axios = require('axios');

// Test getting a single meeting for detail screen
async function testSingleMeeting() {
  console.log('🔍 Testing Single Meeting Retrieval');
  console.log('====================================\n');

  try {
    // Get admin token
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'admin@footballmarketplace.com',
      password: 'Admin123!'
    });
    
    const token = loginResponse.data.accessToken;
    console.log('✅ Admin login successful');

    // Get all meetings to find one to test
    const meetingsResponse = await axios.get('http://localhost:3000/api/meetings', {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!meetingsResponse.data.meetings || meetingsResponse.data.meetings.length === 0) {
      console.log('❌ No meetings found to test');
      return;
    }

    const testMeeting = meetingsResponse.data.meetings[0];
    console.log(`\n📝 Testing meeting detail for ID: ${testMeeting.id}`);

    // Get single meeting
    const singleMeetingResponse = await axios.get(`http://localhost:3000/api/meetings/${testMeeting.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ Single meeting retrieved successfully:');
    console.log('Meeting Details:', {
      id: singleMeetingResponse.data.id,
      request_id: singleMeetingResponse.data.request_id,
      coach_user_id: singleMeetingResponse.data.coach_user_id,
      player_user_id: singleMeetingResponse.data.player_user_id,
      start_at: singleMeetingResponse.data.start_at,
      end_at: singleMeetingResponse.data.end_at,
      duration_minutes: singleMeetingResponse.data.duration_minutes,
      status: singleMeetingResponse.data.status,
      location_uri: singleMeetingResponse.data.location_uri,
      notes: singleMeetingResponse.data.notes,
      coach_name: singleMeetingResponse.data.coach_name,
      player_name: singleMeetingResponse.data.player_name
    });

    console.log('\n✅ Meeting detail screen should work with this data!');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testSingleMeeting();
