const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function testMobileUserConversation() {
  try {
    console.log('🔍 Testing conversation creation with mobile app user...');
    
    // Try to login with user ID 17 (from mobile logs)
    console.log('\n1. Logging in as mobile user...');
    
    // First get the user details
    try {
      const adminLoginResponse = await axios.post(`${BASE_URL}/auth/login`, {
        email: 'admin@footballmarketplace.com',
        password: 'Admin123!'
      });
      
      const adminToken = adminLoginResponse.data.accessToken;
      
      // Get user details for user ID 17
      const usersResponse = await axios.get(`${BASE_URL}/admin/users`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      
      const user17 = usersResponse.data.data.find(user => user.id === '17');
      if (user17) {
        console.log('Found mobile user:', user17);
        
        // Try to login as this user (we don't know the password, but let's check if they exist)
        console.log('User exists in database');
        console.log('Email:', user17.email);
        console.log('Role:', user17.role);
        console.log('Status:', user17.status);
        
        // Create conversation using admin token but simulate the mobile request
        console.log('\n2. Creating conversation with admin token (to test logic)...');
        const conversationData = {
          user_ids: [6],
          title: 'Test',
          type: 'general'
        };
        
        try {
          const response = await axios.post(`${BASE_URL}/chat/conversations`, conversationData, {
            headers: {
              'Authorization': `Bearer ${adminToken}`,
              'Content-Type': 'application/json'
            }
          });
          
          console.log('✅ Conversation created successfully:', response.data);
          
        } catch (createError) {
          console.log('❌ Create conversation failed');
          console.log('Status:', createError.response?.status);
          console.log('Response Data:', createError.response?.data);
        }
        
      } else {
        console.log('❌ User ID 17 not found');
      }
      
    } catch (error) {
      console.log('❌ Error getting user details:', error.response?.data || error.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testMobileUserConversation();
