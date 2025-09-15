const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function testCoachConversation() {
  try {
    // Login as coach (non-admin)
    console.log('🔍 Testing conversation creation as coach...');
    
    console.log('\n1. Logging in as coach...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'coach@test.com',
      password: 'Test123!'
    });
    
    const token = loginResponse.data.accessToken;
    console.log('✅ Coach login successful');
    console.log('User role:', loginResponse.data.user.role);
    console.log('User ID:', loginResponse.data.user.id);
    
    // Try to create general conversation
    console.log('\n2. Creating general conversation...');
    const conversationData = {
      user_ids: [6], // Use user ID 6
      title: 'Test General',
      type: 'general'
    };
    
    console.log('Conversation data:', conversationData);
    
    try {
      const response = await axios.post(`${BASE_URL}/chat/conversations`, conversationData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ General conversation created successfully:', response.data);
      
    } catch (createError) {
      console.log('❌ Create general conversation failed');
      console.log('Status:', createError.response?.status);
      console.log('Status Text:', createError.response?.statusText);
      console.log('Response Data:', createError.response?.data);
      
      // Try support conversation to compare
      console.log('\n3. Trying support conversation (should fail for coach)...');
      try {
        const supportResponse = await axios.post(`${BASE_URL}/chat/conversations`, {
          user_ids: [6],
          title: 'Test Support',
          type: 'support'
        }, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        console.log('✅ Support conversation created (unexpected):', supportResponse.data);
      } catch (supportError) {
        console.log('❌ Support conversation failed (expected)');
        console.log('Support error:', supportError.response?.data);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', error.response.data);
    }
  }
}

testCoachConversation();
