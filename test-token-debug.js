const axios = require('axios');

async function quickTokenTest() {
  try {
    console.log('🔐 Testing token validation...');
    
    // Login
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'admin@footballmarketplace.com',
      password: 'Admin123!'
    });
    
    console.log('✅ Login successful');
    console.log('Login response:', JSON.stringify(loginResponse.data, null, 2));
    
    // Test a simple authenticated endpoint first
    const profileResponse = await axios.get('http://localhost:3000/api/users/profile', {
      headers: { Authorization: `Bearer ${loginResponse.data.accessToken}` }
    });
    
    console.log('✅ Profile endpoint works:', profileResponse.data);
    
    // Now test meetings endpoint
    const meetingsResponse = await axios.get('http://localhost:3000/api/meetings', {
      headers: { Authorization: `Bearer ${loginResponse.data.accessToken}` }
    });
    
    console.log('✅ Meetings endpoint works:', meetingsResponse.data);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.status, error.response?.data || error.message);
  }
}

quickTokenTest();
