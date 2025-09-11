const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function debugConversationCreation() {
  try {
    console.log('🔍 Debugging conversation creation...');
    
    // Step 1: Login as admin
    console.log('\n1. Logging in as admin...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@footballmarketplace.com',
      password: 'Admin123!'
    });
    
    console.log('Login response:', loginResponse.data);
    const token = loginResponse.data.accessToken;
    console.log('Token:', token ? 'Present' : 'Missing');
    console.log('✅ Login successful');
    
    // Step 1.5: Check what users exist
    console.log('\n1.5. Checking existing users...');
    try {
      const usersResponse = await axios.get(`${BASE_URL}/../admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('Existing users:', usersResponse.data);
    } catch (error) {
      console.log('Could not fetch users:', error.response?.status);
    }
    
    // Step 2: Try to create conversation but create a test user first
    console.log('\n2. Creating a test user first...');
    try {
      const testUserResponse = await axios.post(`${BASE_URL}/auth/register`, {
        email: 'testuser@test.com',
        password: 'Test123!',
        name: 'Test User',
        role: 'player'
      });
      console.log('✅ Test user created:', testUserResponse.data);
    } catch (error) {
      console.log('Test user creation failed (user may already exist):', error.response?.data);
    }
    
    // Step 3: Try conversation creation
    console.log('\n3. Creating conversation...');
    
    const conversationData = {
      user_ids: [2], // Use the test user we just created
      type: 'support'
    };
    
    console.log('Conversation data:', conversationData);
    
    try {
      const response = await axios.post(`${BASE_URL}/chat/conversations`, conversationData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Conversation created successfully:', response.data);
      
    } catch (createError) {
      console.log('❌ Create conversation failed');
      console.log('Status:', createError.response?.status);
      console.log('Status Text:', createError.response?.statusText);
      console.log('Response Data:', createError.response?.data);
      console.log('Request URL:', createError.config?.url);
      console.log('Request Method:', createError.config?.method);
      console.log('Request Headers:', createError.config?.headers);
      console.log('Request Data:', createError.config?.data);
      
      if (createError.response?.status === 500) {
        console.log('\n⚠️  This is a server-side error. Check the server logs.');
      }
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugConversationCreation();
