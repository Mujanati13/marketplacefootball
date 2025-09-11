const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function testProfilesDebug() {
  try {
    console.log('Testing GET /api/profiles/players directly...');
    const response = await axios.get(`${BASE_URL}/profiles/players`);
    
    console.log('✅ Profiles retrieved successfully!');
    console.log('Found profiles:', response.data.profiles.length);

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.data?.stack) {
      console.error('Stack:', error.response.data.stack);
    }
  }
}

testProfilesDebug();
