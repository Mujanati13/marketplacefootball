const axios = require('axios');
const mysql = require('mysql2/promise');

// Test meetings API functionality
async function testMeetingsAPI() {
  console.log('🧪 Starting Meetings API Test Suite');
  console.log('=====================================\n');

  try {
    // Connect to database
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'simo1234',
      database: 'football_marketplace'
    });

    console.log('✅ Connected to database\n');

    // Test 1: Create sample data for testing
    console.log('📝 Test 1: Setting up test data');
    
    // Ensure we have an approved request
    await connection.execute(`
      INSERT IGNORE INTO requests (id, sender_id, target_user_id, message, listing_id, status, created_at, updated_at)
      VALUES (10, 2, 1, 'Test approved request for meeting', 1, 'accepted', NOW(), NOW())
    `);

    // Check if the request was created
    const [requests] = await connection.execute(
      'SELECT id, status, sender_id, target_user_id FROM requests WHERE id = 10'
    );
    
    if (requests.length > 0) {
      console.log('✅ Test request created/found:', requests[0]);
    } else {
      console.log('❌ Failed to create test request');
      return;
    }

    // Test 2: Get admin token
    console.log('\n📝 Test 2: Admin authentication');
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'admin@footballmarketplace.com',
      password: 'Admin123!'
    });
    
    const token = loginResponse.data.accessToken;
    console.log('✅ Admin login successful');

    // Test 3: Test meeting creation via HTTP API
    console.log('\n📝 Test 3: Creating meeting via HTTP API');
    
    const meetingData = {
      request_id: 10,
      coach_user_id: 3, // Coach user
      player_user_id: 2, // Player user
      start_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      end_at: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
      location_uri: 'HTTP Test Location - Football Field A',
      notes: 'Meeting created via HTTP API test'
    };

    try {
      const createResponse = await axios.post('http://localhost:3000/api/meetings', meetingData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('✅ Meeting created via HTTP:', createResponse.data);
      const createdMeetingId = createResponse.data.id;

      // Test 4: Get all meetings
      console.log('\n📝 Test 4: Getting all meetings');
      const meetingsResponse = await axios.get('http://localhost:3000/api/meetings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log(`✅ Retrieved ${meetingsResponse.data.meetings?.length || 0} meetings`);
      if (meetingsResponse.data.meetings && meetingsResponse.data.meetings.length > 0) {
        console.log('   Sample meeting:', meetingsResponse.data.meetings[0]);
      }

      // Test 5: Get single meeting
      if (createdMeetingId) {
        console.log('\n📝 Test 5: Getting single meeting');
        const singleMeetingResponse = await axios.get(`http://localhost:3000/api/meetings/${createdMeetingId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('✅ Single meeting retrieved:', singleMeetingResponse.data);
      }

      // Test 6: Update meeting status
      if (createdMeetingId) {
        console.log('\n📝 Test 6: Updating meeting status');
        const updateResponse = await axios.put(`http://localhost:3000/api/meetings/${createdMeetingId}`, {
          status: 'confirmed'
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('✅ Meeting status updated:', updateResponse.data);
      }

      // Test 7: Get user's meetings
      console.log('\n📝 Test 7: Getting user\'s meetings');
      const userMeetingsResponse = await axios.get('http://localhost:3000/api/meetings/my', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log(`✅ User meetings retrieved: ${userMeetingsResponse.data.meetings?.length || 0} meetings`);

    } catch (createError) {
      console.log('❌ Failed to create meeting via HTTP:', createError.response?.data || createError.message);
    }

    await connection.end();
    console.log('\n✅ All tests completed!');
    console.log('=====================================');

  } catch (error) {
    console.error('❌ Test suite failed:', error.response?.data || error.message);
  }
}

// Test database operations directly
async function testMeetingsDatabase() {
  console.log('\n💾 Testing Meetings Database Operations');
  console.log('=======================================\n');

  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'simo1234',
      database: 'football_marketplace'
    });

    // Test meeting creation in database
    console.log('📝 Testing direct database operations');
    
    const testMeeting = {
      request_id: 6, // Use existing request
      coach_user_id: 1,
      player_user_id: 2,
      start_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' '),
      end_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' '),
      location_uri: 'Database Test Location',
      notes: 'Direct database test meeting'
    };

    // Create meeting
    const [result] = await connection.execute(
      `INSERT INTO meetings (
        request_id, coach_user_id, player_user_id, created_by,
        start_at, end_at, location_uri, notes, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', NOW(), NOW())`,
      [
        testMeeting.request_id,
        testMeeting.coach_user_id,
        testMeeting.player_user_id,
        1, // Admin who created it
        testMeeting.start_at,
        testMeeting.end_at,
        testMeeting.location_uri,
        testMeeting.notes
      ]
    );

    const meetingId = result.insertId;
    console.log(`✅ Meeting created with ID: ${meetingId}`);

    // Retrieve meeting with user details
    const [meetings] = await connection.execute(
      `SELECT m.*, 
              c.first_name as coach_first_name, c.last_name as coach_last_name,
              p.first_name as player_first_name, p.last_name as player_last_name,
              r.message as request_message
       FROM meetings m
       LEFT JOIN users c ON m.coach_user_id = c.id
       LEFT JOIN users p ON m.player_user_id = p.id
       LEFT JOIN requests r ON m.request_id = r.id
       WHERE m.id = ?`,
      [meetingId]
    );

    if (meetings.length > 0) {
      console.log('✅ Meeting with details:', meetings[0]);
    }

    // Test conflict detection
    const [conflicts] = await connection.execute(
      `SELECT id FROM meetings 
       WHERE status IN ('scheduled', 'confirmed') 
       AND (coach_user_id = ? OR player_user_id = ?)
       AND start_at < ? AND end_at > ?`,
      [
        testMeeting.coach_user_id,
        testMeeting.player_user_id,
        testMeeting.end_at,
        testMeeting.start_at
      ]
    );

    console.log(`✅ Conflict check: ${conflicts.length} overlapping meetings found`);

    // Cleanup
    await connection.execute('DELETE FROM meetings WHERE id = ?', [meetingId]);
    console.log('✅ Test data cleaned up');

    await connection.end();

  } catch (error) {
    console.error('❌ Database test failed:', error);
  }
}

// Run the tests
if (require.main === module) {
  testMeetingsAPI().then(() => {
    return testMeetingsDatabase();
  });
}

module.exports = { testMeetingsAPI, testMeetingsDatabase };
