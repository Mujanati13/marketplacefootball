const axios = require('axios');

// Debug conflicts in meetings
async function debugMeetingConflicts() {
  console.log('🔍 Debugging Meeting Conflicts');
  console.log('==============================\n');

  try {
    // Get admin token
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'admin@footballmarketplace.com',
      password: 'Admin123!'
    });
    
    const token = loginResponse.data.accessToken;
    console.log('✅ Admin login successful');

    // Get all meetings
    console.log('\n📋 Current meetings in database:');
    const meetingsResponse = await axios.get('http://localhost:3000/api/meetings', {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (meetingsResponse.data.meetings) {
      meetingsResponse.data.meetings.forEach((meeting, index) => {
        console.log(`Meeting ${index + 1}:`, {
          id: meeting.id,
          coach_user_id: meeting.coach_user_id,
          player_user_id: meeting.player_user_id,
          start_at: meeting.start_at,
          end_at: meeting.end_at,
          status: meeting.status,
          location: meeting.location_uri || meeting.location
        });
      });
    }

    // Test the exact data we're trying to create
    console.log('\n🧪 Testing exact meeting data:');
    const testData = {
      request_id: 10,
      coach_user_id: 3,
      player_user_id: 2,
      start_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days from now
      end_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(), // 1 hour later
      location_uri: 'Debug Test Location',
      notes: 'Debug test meeting'
    };

    console.log('Attempting to create:', testData);

    const createResponse = await axios.post('http://localhost:3000/api/meetings', testData, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ Success:', createResponse.data);

    // Clean up
    await axios.delete(`http://localhost:3000/api/meetings/${createResponse.data.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Cleaned up test meeting');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

debugMeetingConflicts();
