const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testDataStructure() {
  try {
    console.log('🧪 Testing Data Structure for User Selection\n');

    // Test the players endpoint to see the exact data structure
    console.log('1. Testing players endpoint structure...');
    const playersResponse = await axios.get(`${BASE_URL}/api/players?limit=5`);
    
    console.log('✅ Players Response Status:', playersResponse.status);
    console.log('📊 Players Data:', JSON.stringify(playersResponse.data, null, 2));
    
    if (playersResponse.data.players && playersResponse.data.players.length > 0) {
      const player = playersResponse.data.players[0];
      console.log('\n👤 Sample Player Processing:');
      
      const firstName = player.first_name ?? '';
      const lastName = player.last_name ?? '';
      const fullName = `${firstName} ${lastName}`.trim();
      const email = player.email ?? '';
      
      console.log('  - first_name:', JSON.stringify(player.first_name));
      console.log('  - last_name:', JSON.stringify(player.last_name));
      console.log('  - email:', JSON.stringify(player.email));
      console.log('  - fullName after trim:', JSON.stringify(fullName));
      console.log('  - fullName.length:', fullName.length);
      console.log('  - fullName.isNotEmpty:', fullName.length > 0);
      
      const finalName = fullName.length > 0 ? fullName : (email.length > 0 ? email : 'Unknown Player');
      console.log('  - Final name:', JSON.stringify(finalName));
      
      // Test initial generation
      const initial = finalName.length > 0 ? finalName[0].toUpperCase() : 'U';
      console.log('  - Initial:', JSON.stringify(initial));
    }

    console.log('\n2. Testing coaches endpoint structure...');
    const coachesResponse = await axios.get(`${BASE_URL}/api/coaches?limit=5`);
    
    console.log('✅ Coaches Response Status:', coachesResponse.status);
    console.log('📊 Coaches Count:', coachesResponse.data.coaches?.length || 0);
    
    if (coachesResponse.data.coaches && coachesResponse.data.coaches.length > 0) {
      console.log('📋 Sample Coach:', JSON.stringify(coachesResponse.data.coaches[0], null, 2));
    } else {
      console.log('📋 No coaches found in database');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('📋 Response:', error.response.status, error.response.data);
    }
  }
}

testDataStructure();
