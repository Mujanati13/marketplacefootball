const axios = require('axios');
const colors = require('colors');

const BASE_URL = 'http://localhost:3000/api';
const ADMIN_URL = 'http://localhost:3000/admin';

// Test configuration
const config = {
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
};

let authToken = '';

// Helper function to make requests
async function makeRequest(method, url, data = null, token = null) {
  try {
    const headers = { ...config.headers };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const requestConfig = {
      method,
      url: url.startsWith('http') ? url : `${BASE_URL}${url}`,
      headers,
      timeout: config.timeout
    };

    // Only add data for POST, PUT, PATCH requests
    if (data !== null && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      requestConfig.data = data;
    }

    const response = await axios(requestConfig);

    return {
      success: true,
      status: response.status,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status || 0,
      error: error.response?.data?.error || error.message,
      data: error.response?.data
    };
  }
}

async function testAuth() {
  console.log('\n=== AUTHENTICATION FOR CHAT & ADMIN TESTS ==='.yellow.bold);
  
  // Test admin login
  console.log('\n1. Testing Admin Login...'.cyan);
  const loginResult = await makeRequest('POST', '/auth/login', {
    email: 'admin@footballmarketplace.com',
    password: 'Admin123!'
  });
  
  if (loginResult.success) {
    console.log('✅ Admin login successful'.green);
    authToken = loginResult.data.accessToken || loginResult.data.token;
    if (authToken) {
      console.log(`   Token: ${authToken.substring(0, 20)}...`.gray);
    } else {
      console.log('   Warning: No token received'.yellow);
      console.log(`   Response data: ${JSON.stringify(loginResult.data, null, 2)}`.gray);
    }
  } else {
    console.log('❌ Admin login failed:'.red, loginResult.error);
    console.log(`   Status: ${loginResult.status}`.gray);
    console.log(`   Response: ${JSON.stringify(loginResult.data, null, 2)}`.gray);
  }

  return authToken;
}

async function testConversations() {
  console.log('\n=== CONVERSATIONS/CHAT TESTS ==='.yellow.bold);

  if (!authToken) {
    console.log('❌ Skipping chat tests - no auth token'.red);
    return;
  }

  // Test get conversations
  console.log('\n1. Testing Get Conversations...'.cyan);
  const getResult = await makeRequest('GET', '/chat/conversations', null, authToken);
  
  if (getResult.success) {
    console.log('✅ Get conversations successful'.green);
    console.log(`   Found ${getResult.data.conversations?.length || 0} conversations`.gray);
  } else {
    console.log('❌ Get conversations failed:'.red, getResult.error);
    console.log(`   Error details: ${getResult.status} - ${JSON.stringify(getResult.data, null, 2)}`.gray);
  }

  // First create participants entries for conversation (simulate existing conversation structure)
  console.log('\n2. Testing Create Conversation...'.cyan);
  const createResult = await makeRequest('POST', '/chat/conversations', {
    user_ids: [2], // Test user, not admin user
    title: 'Test Conversation API',
    type: 'support'
  }, authToken);
  
  if (createResult.success) {
    console.log('✅ Create conversation successful'.green);
    console.log(`   Conversation ID: ${createResult.data.conversation?.id}`.gray);
    
    // Test send message
    const conversationId = createResult.data.conversation?.id;
    if (conversationId) {
      console.log('\n3. Testing Send Message...'.cyan);
      const messageResult = await makeRequest('POST', `/chat/conversations/${conversationId}/messages`, {
        body: 'Test message from API test script',
        attachments: []
      }, authToken);
      
      if (messageResult.success) {
        console.log('✅ Send message successful'.green);
        console.log(`   Message ID: ${messageResult.data.message?.id}`.gray);
      } else {
        console.log('❌ Send message failed:'.red, messageResult.error);
      }

      // Test get messages
      console.log('\n4. Testing Get Messages...'.cyan);
      const messagesResult = await makeRequest('GET', `/chat/conversations/${conversationId}/messages`, null, authToken);
      
      if (messagesResult.success) {
        console.log('✅ Get messages successful'.green);
        console.log(`   Found ${messagesResult.data.messages?.length || 0} messages`.gray);
      } else {
        console.log('❌ Get messages failed:'.red, messagesResult.error);
      }
    }
  } else {
    console.log('❌ Create conversation failed:'.red, createResult.error);
    console.log(`   Error details: ${createResult.status} - ${JSON.stringify(createResult.data, null, 2)}`.gray);
  }
}

async function testAdminDashboard() {
  console.log('\n=== ADMIN DASHBOARD TESTS ==='.yellow.bold);

  // Test admin stats
  console.log('\n1. Testing Admin Stats...'.cyan);
  const statsResult = await makeRequest('GET', `${ADMIN_URL}/stats`);
  
  if (statsResult.success) {
    console.log('✅ Admin stats successful'.green);
    const stats = statsResult.data;
    console.log(`   Total Users: ${stats.totalUsers || 0}`.gray);
    console.log(`   Active Users: ${stats.activeUsers || 0}`.gray);
    console.log(`   Total Listings: ${stats.totalListings || 0}`.gray);
    console.log(`   Active Listings: ${stats.activeListings || 0}`.gray);
    console.log(`   Total Requests: ${stats.totalRequests || 0}`.gray);
    console.log(`   Pending Requests: ${stats.pendingRequests || 0}`.gray);
    console.log(`   Total Meetings: ${stats.totalMeetings || 0}`.gray);
    console.log(`   Recent Activities: ${stats.recentActivity?.length || 0}`.gray);
    
    if (stats.recentActivity && stats.recentActivity.length > 0) {
      console.log('   Latest Activities:'.gray);
      stats.recentActivity.slice(0, 3).forEach((activity, index) => {
        console.log(`     ${index + 1}. ${activity.action}: ${activity.description}`.gray);
      });
    }
  } else {
    console.log('❌ Admin stats failed:'.red, statsResult.error);
    console.log(`   Status: ${statsResult.status}`.gray);
    console.log(`   Response data: ${JSON.stringify(statsResult.data, null, 2)}`.gray);
  }

  // Test admin users
  console.log('\n2. Testing Admin Users Management...'.cyan);
  const usersResult = await makeRequest('GET', `${ADMIN_URL}/users?page=1&limit=5`);
  
  if (usersResult.success) {
    console.log('✅ Admin users successful'.green);
    console.log(`   Found ${usersResult.data.data?.length || 0} users`.gray);
    console.log(`   Total users: ${usersResult.data.pagination?.total || 0}`.gray);
    console.log(`   Pages: ${usersResult.data.pagination?.pages || 0}`.gray);
    
    if (usersResult.data.data && usersResult.data.data.length > 0) {
      console.log('   Sample Users:'.gray);
      usersResult.data.data.slice(0, 2).forEach((user, index) => {
        console.log(`     ${index + 1}. ${user.name} (${user.email}) - ${user.role} - ${user.status}`.gray);
      });
    }
  } else {
    console.log('❌ Admin users failed:'.red, statsResult.error);
  }

  // Test admin listings
  console.log('\n3. Testing Admin Listings...'.cyan);
  const listingsResult = await makeRequest('GET', `${ADMIN_URL}/listings?page=1&limit=5`);
  
  if (listingsResult.success) {
    console.log('✅ Admin listings successful'.green);
    console.log(`   Found ${listingsResult.data.data?.length || 0} listings`.gray);
    console.log(`   Total listings: ${listingsResult.data.pagination?.total || 0}`.gray);
  } else {
    console.log('❌ Admin listings failed:'.red, listingsResult.error);
  }

  // Test admin requests
  console.log('\n4. Testing Admin Requests...'.cyan);
  const requestsResult = await makeRequest('GET', `${ADMIN_URL}/requests?page=1&limit=5`);
  
  if (requestsResult.success) {
    console.log('✅ Admin requests successful'.green);
    console.log(`   Found ${requestsResult.data.data?.length || 0} requests`.gray);
    console.log(`   Total requests: ${requestsResult.data.pagination?.total || 0}`.gray);
  } else {
    console.log('❌ Admin requests failed:'.red, requestsResult.error);
  }

  // Test admin meetings
  console.log('\n5. Testing Admin Meetings...'.cyan);
  const meetingsResult = await makeRequest('GET', `${ADMIN_URL}/meetings?page=1&limit=5`);
  
  if (meetingsResult.success) {
    console.log('✅ Admin meetings successful'.green);
    console.log(`   Found ${meetingsResult.data.data?.length || 0} meetings`.gray);
    console.log(`   Total meetings: ${meetingsResult.data.pagination?.total || 0}`.gray);
  } else {
    console.log('❌ Admin meetings failed:'.red, meetingsResult.error);
  }

  // Test user status update
  if (usersResult.success && usersResult.data.data && usersResult.data.data.length > 0) {
    const testUser = usersResult.data.data.find(u => u.role !== 'admin');
    if (testUser) {
      console.log('\n6. Testing User Status Update...'.cyan);
      const newStatus = testUser.status === 'active' ? 'inactive' : 'active';
      const updateResult = await makeRequest('PUT', `${ADMIN_URL}/users/${testUser.id}/status`, {
        status: newStatus
      });
      
      if (updateResult.success) {
        console.log('✅ User status update successful'.green);
        console.log(`   Updated user ${testUser.name} status to: ${newStatus}`.gray);
        
        // Restore original status
        await makeRequest('PUT', `${ADMIN_URL}/users/${testUser.id}/status`, {
          status: testUser.status
        });
        console.log(`   Restored original status: ${testUser.status}`.gray);
      } else {
        console.log('❌ User status update failed:'.red, updateResult.error);
      }
    }
  }
}

async function testServerHealth() {
  console.log('\n=== SERVER HEALTH CHECK ==='.yellow.bold);

  console.log('\n1. Testing Server Connectivity...'.cyan);
  try {
    const response = await axios.get(`${BASE_URL}/listings`, { timeout: 5000 });
    console.log('✅ Server is reachable and responding'.green);
    console.log(`   Response status: ${response.status}`.gray);
  } catch (err) {
    console.log('❌ Server is not reachable:'.red, err.message);
  }
}

// Main test runner
async function runChatAndAdminTests() {
  console.log('🚀 Starting Chat & Admin Dashboard API Tests...'.rainbow.bold);
  console.log(`📡 Base URL: ${BASE_URL}`.gray);
  console.log(`📊 Admin URL: ${ADMIN_URL}`.gray);
  console.log('=' + '='.repeat(60));

  const startTime = Date.now();
  let passedTests = 0;
  let totalTests = 0;

  try {
    await testServerHealth();
    
  const token = await testAuth();
  if (token) {
    await testConversations();
  } else {
    console.log('❌ Skipping conversations test - no valid token'.red);
  }    await testAdminDashboard();
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log('\n' + '='.repeat(60));
    console.log(`🎉 Chat & Admin tests completed in ${duration}s`.rainbow.bold);
    console.log('=' + '='.repeat(60));
    
  } catch (error) {
    console.log('\n💥 Test suite failed:'.red.bold, error.message);
    console.log('Error stack:'.gray, error.stack);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runChatAndAdminTests().catch(console.error);
}

module.exports = {
  runChatAndAdminTests,
  testAuth,
  testConversations,
  testAdminDashboard,
  testServerHealth
};
