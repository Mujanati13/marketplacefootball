const axios = require('axios');
const colors = require('colors');

const BASE_URL = 'http://localhost:3000/api';
const ADMIN_URL = 'http://localhost:3000/admin';

let authToken = null;

// Simple test for mobile app API integration
async function testMobileAPIIntegration() {
  console.log('📱 Testing Mobile App API Integration...'.cyan.bold);
  console.log('📡 Base URL:', BASE_URL);
  console.log('📊 Admin URL:', ADMIN_URL);
  console.log('='.repeat(60).yellow);

  try {
    // Test 1: Authentication
    console.log('\n=== AUTHENTICATION TEST ==='.yellow.bold);
    await testAuth();

    // Test 2: Chat/Conversations
    console.log('\n=== CHAT/CONVERSATIONS TEST ==='.yellow.bold);
    await testConversations();

    // Test 3: Admin Dashboard
    console.log('\n=== ADMIN DASHBOARD TEST ==='.yellow.bold);
    await testAdminDashboard();

    console.log('\n' + '='.repeat(60).yellow);
    console.log('🎉 Mobile API Integration Test Completed!'.green.bold);

  } catch (error) {
    console.error('❌ Test Suite Failed:'.red.bold, error.message);
  }
}

async function testAuth() {
  console.log('1. Testing Admin Login...'.cyan);
  
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@footballmarketplace.com',
      password: 'Admin123!'
    });

    if (response.data.accessToken) {
      authToken = response.data.accessToken;
      console.log('✅ Authentication successful'.green);
      console.log(`   User: ${response.data.user.name} (${response.data.user.role})`.gray);
      return true;
    } else {
      console.log('❌ No access token received'.red);
      return false;
    }
  } catch (error) {
    console.log('❌ Authentication failed:'.red, error.response?.data?.message || error.message);
    return false;
  }
}

async function testConversations() {
  if (!authToken) {
    console.log('❌ No auth token available for conversations test'.red);
    return;
  }

  // Test 1: Get conversations
  console.log('1. Testing Get Conversations...'.cyan);
  try {
    const response = await axios.get(`${BASE_URL}/chat/conversations`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    console.log('✅ Get conversations successful'.green);
    console.log(`   Found ${response.data.conversations.length} conversations`.gray);

    // Test 2: Get specific conversation (if any exist)
    if (response.data.conversations.length > 0) {
      const conversationId = response.data.conversations[0].id;
      console.log('2. Testing Get Messages...'.cyan);
      
      try {
        const messagesResponse = await axios.get(
          `${BASE_URL}/chat/conversations/${conversationId}/messages`,
          {
            headers: { 'Authorization': `Bearer ${authToken}` }
          }
        );

        console.log('✅ Get messages successful'.green);
        console.log(`   Found ${messagesResponse.data.messages.length} messages`.gray);

        // Test 3: Send a test message
        console.log('3. Testing Send Message...'.cyan);
        try {
          const sendResponse = await axios.post(
            `${BASE_URL}/chat/conversations/${conversationId}/messages`,
            {
              body: 'Test message from mobile API integration test',
              attachments: []
            },
            {
              headers: { 'Authorization': `Bearer ${authToken}` }
            }
          );

          console.log('✅ Send message successful'.green);
          console.log(`   Message ID: ${sendResponse.data.id || 'N/A'}`.gray);
        } catch (error) {
          console.log('❌ Send message failed:'.red, error.response?.data?.error || error.message);
        }

      } catch (error) {
        console.log('❌ Get messages failed:'.red, error.response?.data?.error || error.message);
      }
    }

  } catch (error) {
    console.log('❌ Get conversations failed:'.red, error.response?.data?.error || error.message);
  }
}

async function testAdminDashboard() {
  if (!authToken) {
    console.log('❌ No auth token available for admin test'.red);
    return;
  }

  // Test 1: Get admin stats
  console.log('1. Testing Admin Stats...'.cyan);
  try {
    const response = await axios.get(`${ADMIN_URL}/stats`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    console.log('✅ Admin stats successful'.green);
    console.log(`   Total Users: ${response.data.total_users}`.gray);
    console.log(`   Total Listings: ${response.data.total_listings}`.gray);
    console.log(`   Recent Activities: ${response.data.recent_activity?.length || 0}`.gray);
  } catch (error) {
    console.log('❌ Admin stats failed:'.red, error.response?.data?.error || error.message);
  }

  // Test 2: Get admin users
  console.log('2. Testing Admin Users...'.cyan);
  try {
    const response = await axios.get(`${ADMIN_URL}/users?page=1&limit=5`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    console.log('✅ Admin users successful'.green);
    console.log(`   Found ${response.data.data?.length || 0} users`.gray);
  } catch (error) {
    console.log('❌ Admin users failed:'.red, error.response?.data?.error || error.message);
  }

  // Test 3: Get admin listings
  console.log('3. Testing Admin Listings...'.cyan);
  try {
    const response = await axios.get(`${ADMIN_URL}/listings?page=1&limit=5`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    console.log('✅ Admin listings successful'.green);
    console.log(`   Found ${response.data.data?.length || 0} listings`.gray);
  } catch (error) {
    console.log('❌ Admin listings failed:'.red, error.response?.data?.error || error.message);
  }
}

// Run the test
if (require.main === module) {
  testMobileAPIIntegration();
}

module.exports = { testMobileAPIIntegration };
