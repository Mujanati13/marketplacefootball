const axios = require('axios');
const colors = require('colors');

// Test configuration
const BASE_URL = 'http://localhost:3000/api';
const ADMIN_URL = 'http://localhost:3000/api/admin';
const TEST_TIMEOUT = 10000;

// Test credentials
const ADMIN_CREDENTIALS = {
  email: 'admin@footballmarketplace.com',
  password: 'Admin123!'
};

const TEST_USER_CREDENTIALS = {
  email: 'testuser@example.com',
  password: 'TestUser123!'
};

const TEST_USER_2_CREDENTIALS = {
  email: 'testuser2@example.com',
  password: 'TestUser123!'
};

let adminToken = null;
let userToken = null;
let user2Token = null;
let testUserId = null;
let testUser2Id = null;
let testConversationId = null;
let testMessageId = null;

// Utility functions
const log = {
  success: (msg) => console.log('✅', msg.green),
  error: (msg) => console.log('❌', msg.red),
  info: (msg) => console.log('ℹ️ ', msg.blue),
  test: (msg) => console.log('🧪', msg.yellow),
  section: (msg) => console.log('\n' + '='.repeat(50).cyan + '\n' + msg.cyan.bold + '\n' + '='.repeat(50).cyan)
};

const makeRequest = async (method, url, data = null, token = null) => {
  try {
    const config = {
      method,
      url: url.startsWith('http') ? url : `${BASE_URL}${url}`,
      timeout: TEST_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      ...(data && { data })
    };

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || error.message,
      status: error.response?.status || 500,
      data: error.response?.data
    };
  }
};

// Authentication helpers
const loginAdmin = async () => {
  log.test('Logging in as admin...');
  const result = await makeRequest('POST', '/auth/login', ADMIN_CREDENTIALS);
  
  if (result.success && result.data.token) {
    adminToken = result.data.token;
    log.success('Admin login successful');
    return true;
  } else {
    log.error(`Admin login failed: ${result.error}`);
    return false;
  }
};

const loginUser = async () => {
  log.test('Logging in as test user...');
  const result = await makeRequest('POST', '/auth/login', TEST_USER_CREDENTIALS);
  
  if (result.success && result.data.token) {
    userToken = result.data.token;
    testUserId = result.data.user.id;
    log.success('User login successful');
    return true;
  } else {
    log.error(`User login failed: ${result.error}`);
    return false;
  }
};

const loginUser2 = async () => {
  log.test('Logging in as test user 2...');
  const result = await makeRequest('POST', '/auth/login', TEST_USER_2_CREDENTIALS);
  
  if (result.success && result.data.token) {
    user2Token = result.data.token;
    testUser2Id = result.data.user.id;
    log.success('User 2 login successful');
    return true;
  } else {
    log.error(`User 2 login failed: ${result.error}`);
    return false;
  }
};

// Test users creation
const createTestUsers = async () => {
  log.test('Creating test users...');
  
  // Create test user 1
  const user1Data = {
    email: TEST_USER_CREDENTIALS.email,
    password: TEST_USER_CREDENTIALS.password,
    name: 'Test User 1',
    role: 'player'
  };
  
  const user1Result = await makeRequest('POST', '/auth/register', user1Data);
  if (user1Result.success) {
    log.success('Test user 1 created successfully');
  } else if (user1Result.status === 400 && user1Result.error.includes('already exists')) {
    log.info('Test user 1 already exists');
  } else {
    log.error(`Failed to create test user 1: ${user1Result.error}`);
  }
  
  // Create test user 2
  const user2Data = {
    email: TEST_USER_2_CREDENTIALS.email,
    password: TEST_USER_2_CREDENTIALS.password,
    name: 'Test User 2',
    role: 'coach'
  };
  
  const user2Result = await makeRequest('POST', '/auth/register', user2Data);
  if (user2Result.success) {
    log.success('Test user 2 created successfully');
  } else if (user2Result.status === 400 && user2Result.error.includes('already exists')) {
    log.info('Test user 2 already exists');
  } else {
    log.error(`Failed to create test user 2: ${user2Result.error}`);
  }
};

// Chat/Messages API Tests
const testChatAPI = async () => {
  log.section('TESTING CHAT/MESSAGES API');

  // Test 1: Get conversations (empty list initially)
  log.test('Test 1: Get user conversations');
  const conversationsResult = await makeRequest('GET', '/chat/conversations', null, userToken);
  if (conversationsResult.success) {
    log.success(`Get conversations successful. Found ${conversationsResult.data.conversations?.length || 0} conversations`);
  } else {
    log.error(`Get conversations failed: ${conversationsResult.error}`);
  }

  // Test 2: Create a conversation
  log.test('Test 2: Create conversation');
  const conversationData = {
    participant_ids: [testUser2Id],
    title: 'Test Conversation',
    type: 'general'
  };
  
  const createConvResult = await makeRequest('POST', '/chat/conversations', conversationData, userToken);
  if (createConvResult.success) {
    testConversationId = createConvResult.data.conversation?.id;
    log.success(`Conversation created successfully. ID: ${testConversationId}`);
  } else {
    log.error(`Create conversation failed: ${createConvResult.error}`);
  }

  // Test 3: Get conversation details
  if (testConversationId) {
    log.test('Test 3: Get conversation details');
    const convDetailsResult = await makeRequest('GET', `/chat/conversations/${testConversationId}`, null, userToken);
    if (convDetailsResult.success) {
      log.success('Get conversation details successful');
    } else {
      log.error(`Get conversation details failed: ${convDetailsResult.error}`);
    }
  }

  // Test 4: Send a message
  if (testConversationId) {
    log.test('Test 4: Send message');
    const messageData = {
      content: 'Hello! This is a test message.',
      type: 'text'
    };
    
    const sendMessageResult = await makeRequest('POST', `/chat/conversations/${testConversationId}/messages`, messageData, userToken);
    if (sendMessageResult.success) {
      testMessageId = sendMessageResult.data.message?.id;
      log.success(`Message sent successfully. ID: ${testMessageId}`);
    } else {
      log.error(`Send message failed: ${sendMessageResult.error}`);
    }
  }

  // Test 5: Get messages in conversation
  if (testConversationId) {
    log.test('Test 5: Get conversation messages');
    const messagesResult = await makeRequest('GET', `/chat/conversations/${testConversationId}/messages`, null, userToken);
    if (messagesResult.success) {
      log.success(`Get messages successful. Found ${messagesResult.data.messages?.length || 0} messages`);
    } else {
      log.error(`Get messages failed: ${messagesResult.error}`);
    }
  }

  // Test 6: Send message as user 2
  if (testConversationId) {
    log.test('Test 6: Send message as user 2');
    const messageData = {
      content: 'Hi! This is user 2 replying.',
      type: 'text'
    };
    
    const sendMessageResult = await makeRequest('POST', `/chat/conversations/${testConversationId}/messages`, messageData, user2Token);
    if (sendMessageResult.success) {
      log.success('Message sent as user 2 successfully');
    } else {
      log.error(`Send message as user 2 failed: ${sendMessageResult.error}`);
    }
  }

  // Test 7: Mark messages as read
  if (testConversationId) {
    log.test('Test 7: Mark messages as read');
    const markReadResult = await makeRequest('PUT', `/chat/conversations/${testConversationId}/read`, null, user2Token);
    if (markReadResult.success) {
      log.success('Messages marked as read successfully');
    } else {
      log.error(`Mark messages as read failed: ${markReadResult.error}`);
    }
  }

  // Test 8: Get updated conversations list
  log.test('Test 8: Get updated conversations list');
  const updatedConversationsResult = await makeRequest('GET', '/chat/conversations', null, userToken);
  if (updatedConversationsResult.success) {
    log.success(`Updated conversations list retrieved. Found ${updatedConversationsResult.data.conversations?.length || 0} conversations`);
  } else {
    log.error(`Get updated conversations failed: ${updatedConversationsResult.error}`);
  }
};

// Admin Dashboard API Tests
const testAdminDashboardAPI = async () => {
  log.section('TESTING ADMIN DASHBOARD API');

  // Test 1: Get dashboard statistics
  log.test('Test 1: Get dashboard statistics');
  const statsResult = await makeRequest('GET', `${ADMIN_URL}/dashboard/stats`, null, adminToken);
  if (statsResult.success) {
    log.success('Dashboard statistics retrieved successfully');
    log.info(`Users: ${statsResult.data.stats?.totalUsers || 0}`);
    log.info(`Listings: ${statsResult.data.stats?.totalListings || 0}`);
    log.info(`Requests: ${statsResult.data.stats?.totalRequests || 0}`);
  } else {
    log.error(`Get dashboard stats failed: ${statsResult.error}`);
  }

  // Test 2: Get all users (admin)
  log.test('Test 2: Get all users');
  const usersResult = await makeRequest('GET', `${ADMIN_URL}/users`, null, adminToken);
  if (usersResult.success) {
    log.success(`Users list retrieved. Found ${usersResult.data.data?.length || 0} users`);
  } else {
    log.error(`Get users failed: ${usersResult.error}`);
  }

  // Test 3: Get user details
  if (testUserId) {
    log.test('Test 3: Get user details');
    const userDetailsResult = await makeRequest('GET', `${ADMIN_URL}/users/${testUserId}`, null, adminToken);
    if (userDetailsResult.success) {
      log.success('User details retrieved successfully');
    } else {
      log.error(`Get user details failed: ${userDetailsResult.error}`);
    }
  }

  // Test 4: Update user status
  if (testUserId) {
    log.test('Test 4: Update user status');
    const updateStatusData = {
      status: 'inactive'
    };
    
    const updateStatusResult = await makeRequest('PUT', `${ADMIN_URL}/users/${testUserId}/status`, updateStatusData, adminToken);
    if (updateStatusResult.success) {
      log.success('User status updated successfully');
    } else {
      log.error(`Update user status failed: ${updateStatusResult.error}`);
    }
  }

  // Test 5: Get admin requests queue
  log.test('Test 5: Get admin requests queue');
  const requestsQueueResult = await makeRequest('GET', `${ADMIN_URL}/requests`, null, adminToken);
  if (requestsQueueResult.success) {
    log.success(`Requests queue retrieved. Found ${requestsQueueResult.data.requests?.length || 0} requests`);
  } else {
    log.error(`Get requests queue failed: ${requestsQueueResult.error}`);
  }

  // Test 6: Get system logs/activity
  log.test('Test 6: Get system activity logs');
  const logsResult = await makeRequest('GET', `${ADMIN_URL}/logs`, null, adminToken);
  if (logsResult.success) {
    log.success(`Activity logs retrieved. Found ${logsResult.data.logs?.length || 0} log entries`);
  } else {
    log.error(`Get activity logs failed: ${logsResult.error}`);
  }

  // Test 7: Get platform statistics
  log.test('Test 7: Get platform statistics');
  const platformStatsResult = await makeRequest('GET', `${ADMIN_URL}/stats`, null, adminToken);
  if (platformStatsResult.success) {
    log.success('Platform statistics retrieved successfully');
  } else {
    log.error(`Get platform stats failed: ${platformStatsResult.error}`);
  }

  // Test 8: Test unauthorized access (without admin token)
  log.test('Test 8: Test unauthorized access (should fail)');
  const unauthorizedResult = await makeRequest('GET', `${ADMIN_URL}/users`, null, userToken);
  if (!unauthorizedResult.success && unauthorizedResult.status === 403) {
    log.success('Unauthorized access properly blocked');
  } else {
    log.error('Unauthorized access was not properly blocked');
  }
};

// Error handling and edge cases
const testErrorHandling = async () => {
  log.section('TESTING ERROR HANDLING');

  // Test 1: Invalid conversation ID
  log.test('Test 1: Access invalid conversation');
  const invalidConvResult = await makeRequest('GET', '/chat/conversations/99999', null, userToken);
  if (!invalidConvResult.success && (invalidConvResult.status === 404 || invalidConvResult.status === 403)) {
    log.success('Invalid conversation access properly handled');
  } else {
    log.error('Invalid conversation access not properly handled');
  }

  // Test 2: Send message to non-existent conversation
  log.test('Test 2: Send message to invalid conversation');
  const invalidMessageData = {
    content: 'This should fail',
    type: 'text'
  };
  const invalidMessageResult = await makeRequest('POST', '/chat/conversations/99999/messages', invalidMessageData, userToken);
  if (!invalidMessageResult.success) {
    log.success('Invalid message send properly handled');
  } else {
    log.error('Invalid message send was not properly handled');
  }

  // Test 3: Admin access without token
  log.test('Test 3: Admin access without authentication');
  const noAuthResult = await makeRequest('GET', `${ADMIN_URL}/users`);
  if (!noAuthResult.success && noAuthResult.status === 401) {
    log.success('Unauthenticated admin access properly blocked');
  } else {
    log.error('Unauthenticated admin access was not properly blocked');
  }

  // Test 4: Access other user's conversations
  log.test('Test 4: Cross-user conversation access');
  if (testConversationId) {
    // Try to access conversation as admin (should work)
    const adminAccessResult = await makeRequest('GET', `/chat/conversations/${testConversationId}`, null, adminToken);
    if (adminAccessResult.success) {
      log.success('Admin can access user conversations');
    } else {
      log.info('Admin conversation access blocked (this may be expected)');
    }
  }
};

// Performance and pagination tests
const testPaginationAndPerformance = async () => {
  log.section('TESTING PAGINATION AND PERFORMANCE');

  // Test 1: Paginated conversations
  log.test('Test 1: Paginated conversations');
  const paginatedResult = await makeRequest('GET', '/chat/conversations?page=1&limit=5', null, userToken);
  if (paginatedResult.success) {
    log.success('Paginated conversations retrieved successfully');
  } else {
    log.error(`Paginated conversations failed: ${paginatedResult.error}`);
  }

  // Test 2: Paginated messages
  if (testConversationId) {
    log.test('Test 2: Paginated messages');
    const paginatedMessagesResult = await makeRequest('GET', `/chat/conversations/${testConversationId}/messages?page=1&limit=10`, null, userToken);
    if (paginatedMessagesResult.success) {
      log.success('Paginated messages retrieved successfully');
    } else {
      log.error(`Paginated messages failed: ${paginatedMessagesResult.error}`);
    }
  }

  // Test 3: Admin paginated users
  log.test('Test 3: Admin paginated users');
  const paginatedUsersResult = await makeRequest('GET', `${ADMIN_URL}/users?page=1&limit=10`, null, adminToken);
  if (paginatedUsersResult.success) {
    log.success('Paginated users retrieved successfully');
  } else {
    log.error(`Paginated users failed: ${paginatedUsersResult.error}`);
  }
};

// Main test execution
const runTests = async () => {
  console.log('🚀 Starting Message and Admin Dashboard API Tests\n'.rainbow.bold);
  
  try {
    // Setup phase
    log.section('SETUP PHASE');
    
    // Create test users
    await createTestUsers();
    
    // Login users
    const adminLoginSuccess = await loginAdmin();
    const userLoginSuccess = await loginUser();
    const user2LoginSuccess = await loginUser2();
    
    if (!adminLoginSuccess || !userLoginSuccess || !user2LoginSuccess) {
      log.error('Failed to login all required users. Aborting tests.');
      process.exit(1);
    }
    
    // Run tests
    await testChatAPI();
    await testAdminDashboardAPI();
    await testErrorHandling();
    await testPaginationAndPerformance();
    
    log.section('TEST SUMMARY');
    log.success('All tests completed! Check the results above for any failures.');
    
  } catch (error) {
    log.error(`Test execution failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
};

// Check if server is running
const checkServer = async () => {
  try {
    const result = await makeRequest('GET', '/health');
    if (result.success) {
      log.success('Server is running and healthy');
      return true;
    } else {
      log.error('Server health check failed');
      return false;
    }
  } catch (error) {
    log.error('Cannot connect to server. Make sure it\'s running on http://localhost:3000');
    return false;
  }
};

// Entry point
const main = async () => {
  const serverRunning = await checkServer();
  if (!serverRunning) {
    log.error('Server is not accessible. Please start the server first.');
    process.exit(1);
  }
  
  await runTests();
};

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
  log.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  log.error(`Uncaught Exception: ${error.message}`);
  console.error(error);
  process.exit(1);
});

// Run the tests
if (require.main === module) {
  main();
}

module.exports = {
  runTests,
  checkServer,
  testChatAPI,
  testAdminDashboardAPI,
  testErrorHandling,
  testPaginationAndPerformance
};
