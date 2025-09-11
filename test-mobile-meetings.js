const axios = require('axios');

// Test meetings API for mobile app compatibility
async function testMobileMeetingsAPI() {
  console.log('📱 Testing Mobile Meetings API Compatibility');
  console.log('===============================================\n');

  try {
    // Test 1: Get admin token
    console.log('📝 Test 1: Admin authentication');
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'admin@footballmarketplace.com',
      password: 'Admin123!'
    });
    
    const token = loginResponse.data.accessToken;
    console.log('✅ Admin login successful');

    // Clean up any existing test meetings first
    console.log('\n📝 Test 1.5: Cleaning up existing test meetings');
    try {
      const existingResponse = await axios.get('http://localhost:3000/api/meetings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (existingResponse.data.meetings) {
        for (const meeting of existingResponse.data.meetings) {
          if (meeting.notes && meeting.notes.includes('Mobile App Test Location')) {
            await axios.delete(`http://localhost:3000/api/meetings/${meeting.id}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            console.log(`✅ Cleaned up test meeting ${meeting.id}`);
          }
        }
      }
    } catch (e) {
      console.log('ℹ️  No existing test meetings to clean up');
    }

    // Test 2: Create meeting with future time to avoid conflicts
    console.log('\n📝 Test 2: Creating meeting for mobile app');
    
    const meetingData = {
      request_id: 10,
      coach_user_id: 4, // Coach Test 2 - new user
      player_user_id: 5, // Player Test 2 - new user
      start_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      end_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(), // 1 hour later
      location_uri: 'Mobile App Test Location',
      notes: 'Meeting created from mobile app test'
    };

    try {
      const createResponse = await axios.post('http://localhost:3000/api/meetings', meetingData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('✅ Meeting created successfully:', {
        id: createResponse.data.id,
        status: createResponse.data.status,
        start_at: createResponse.data.start_at,
        end_at: createResponse.data.end_at
      });

      const meetingId = createResponse.data.id;

      // Test 3: Get meetings list (mobile app format)
      console.log('\n📝 Test 3: Getting meetings for mobile app');
      const meetingsResponse = await axios.get('http://localhost:3000/api/meetings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log(`✅ Retrieved ${meetingsResponse.data.meetings?.length || 0} meetings`);
      
      if (meetingsResponse.data.meetings && meetingsResponse.data.meetings.length > 0) {
        const meeting = meetingsResponse.data.meetings.find(m => m.id == meetingId);
        if (meeting) {
          console.log('✅ Mobile format verification:', {
            id: meeting.id,
            request_id: meeting.request_id,
            coach_user_id: meeting.coach_user_id,
            player_user_id: meeting.player_user_id,
            start_at: meeting.start_at,
            end_at: meeting.end_at,
            location_uri: meeting.location_uri,
            notes: meeting.notes,
            status: meeting.status
          });
        }
      }

      // Test 4: Update meeting status (mobile app use case)
      console.log('\n📝 Test 4: Updating meeting status for mobile');
      const updateResponse = await axios.put(`http://localhost:3000/api/meetings/${meetingId}`, {
        status: 'inProgress'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('✅ Meeting status updated:', {
        id: updateResponse.data.id,
        status: updateResponse.data.status
      });

      // Test 5: Clean up
      console.log('\n📝 Test 5: Cleaning up test data');
      await axios.delete(`http://localhost:3000/api/meetings/${meetingId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Test meeting deleted');

    } catch (error) {
      console.log('❌ API Error:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }

  console.log('\n📱 Mobile Meetings API test completed!');
}

// Run the test
testMobileMeetingsAPI();
