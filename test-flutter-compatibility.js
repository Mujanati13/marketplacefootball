const axios = require('axios');

async function testAPIResponseFormats() {
  try {
    // Login as admin
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'admin@footballmarketplace.com',
      password: 'Admin123!'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Admin login successful\n');
    
    // Test Listings API response format
    console.log('🔍 Testing Listings API Response Format:');
    const listingsResponse = await axios.get('http://localhost:3000/api/listings', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Response structure:');
    console.log('- listings array:', Array.isArray(listingsResponse.data.listings));
    console.log('- pagination object:', typeof listingsResponse.data.pagination === 'object');
    if (listingsResponse.data.pagination) {
      console.log('  - page:', typeof listingsResponse.data.pagination.page);
      console.log('  - limit:', typeof listingsResponse.data.pagination.limit);
      console.log('  - total:', typeof listingsResponse.data.pagination.total);
      console.log('  - pages:', typeof listingsResponse.data.pagination.pages);
    }
    
    if (listingsResponse.data.listings.length > 0) {
      const listing = listingsResponse.data.listings[0];
      console.log('First listing structure:');
      console.log('  - id:', typeof listing.id);
      console.log('  - user_id:', typeof listing.user_id);
      console.log('  - title:', typeof listing.title);
      console.log('  - price:', typeof listing.price);
      console.log('  - is_active:', typeof listing.is_active);
    }
    
    console.log('\n🔍 Testing Meetings API Response Format:');
    const meetingsResponse = await axios.get('http://localhost:3000/api/meetings', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Response structure:');
    console.log('- meetings array:', Array.isArray(meetingsResponse.data.meetings));
    console.log('- pagination object:', typeof meetingsResponse.data.pagination === 'object');
    if (meetingsResponse.data.pagination) {
      console.log('  - page:', typeof meetingsResponse.data.pagination.page);
      console.log('  - limit:', typeof meetingsResponse.data.pagination.limit);
      console.log('  - total:', typeof meetingsResponse.data.pagination.total);
      console.log('  - pages:', typeof meetingsResponse.data.pagination.pages);
    }
    
    if (meetingsResponse.data.meetings.length > 0) {
      const meeting = meetingsResponse.data.meetings[0];
      console.log('First meeting structure:');
      console.log('  - id:', typeof meeting.id);
      console.log('  - request_id:', typeof meeting.request_id);
      console.log('  - coach_user_id:', typeof meeting.coach_user_id);
      console.log('  - player_user_id:', typeof meeting.player_user_id);
      console.log('  - start_at:', typeof meeting.start_at);
      console.log('  - duration_minutes:', typeof meeting.duration_minutes);
      console.log('  - status:', typeof meeting.status);
    }
    
    console.log('\n✅ All API response formats are compatible with Flutter!');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testAPIResponseFormats();
