const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = (message, color = 'reset') => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

const runTest = async (testName, testFn) => {
  try {
    log(`\n🧪 Testing: ${testName}`, 'cyan');
    await testFn();
    log(`✅ PASSED: ${testName}`, 'green');
    testResults.passed++;
    testResults.tests.push({ name: testName, status: 'PASSED' });
  } catch (error) {
    log(`❌ FAILED: ${testName} - ${error.message}`, 'red');
    testResults.failed++;
    testResults.tests.push({ name: testName, status: 'FAILED', error: error.message });
  }
};

// Test functions
const testAdminLogin = async () => {
  const response = await axios.post(`${BASE_URL}/auth/login`, {
    email: 'admin@footballmarketplace.com',
    password: 'admin123'
  });
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (!response.data.token) {
    throw new Error('No token in response');
  }
  
  if (!response.data.user) {
    throw new Error('No user data in response');
  }
  
  // Store token for subsequent tests
  global.authToken = response.data.token;
  global.adminUser = response.data.user;
  
  log(`  Token received: ${response.data.token.substring(0, 20)}...`, 'yellow');
  log(`  User: ${response.data.user.email} (${response.data.user.role})`, 'yellow');
};

const testUserRegistration = async () => {
  const testUser = {
    email: `test.user.${Date.now()}@example.com`,
    password: 'password123',
    role: 'player',
    firstName: 'Test',
    lastName: 'User',
    dateOfBirth: '1995-01-01',
    nationality: 'USA',
    position: 'midfielder'
  };
  
  const response = await axios.post(`${BASE_URL}/auth/register`, testUser);
  
  if (response.status !== 201) {
    throw new Error(`Expected status 201, got ${response.status}`);
  }
  
  if (!response.data.token) {
    throw new Error('No token in registration response');
  }
  
  global.testUser = response.data.user;
  global.testUserToken = response.data.token;
  
  log(`  Registered user: ${testUser.email}`, 'yellow');
};

const testGetProfile = async () => {
  if (!global.authToken) {
    throw new Error('No auth token available');
  }
  
  const response = await axios.get(`${BASE_URL}/profile`, {
    headers: { Authorization: `Bearer ${global.authToken}` }
  });
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (!response.data.user) {
    throw new Error('No user data in profile response');
  }
  
  log(`  Profile retrieved for: ${response.data.user.email}`, 'yellow');
};

const testCreateListing = async () => {
  if (!global.testUserToken) {
    throw new Error('No test user token available');
  }
  
  const listing = {
    title: 'Test Listing - Midfielder Seeking Team',
    description: 'Experienced midfielder looking for a competitive team',
    type: 'player_seeking_team',
    position: 'midfielder',
    experienceLevel: 'amateur',
    location: 'New York, NY'
  };
  
  const response = await axios.post(`${BASE_URL}/listings`, listing, {
    headers: { Authorization: `Bearer ${global.testUserToken}` }
  });
  
  if (response.status !== 201) {
    throw new Error(`Expected status 201, got ${response.status}`);
  }
  
  if (!response.data.id) {
    throw new Error('No listing ID in response');
  }
  
  global.testListing = response.data;
  
  log(`  Created listing: ${listing.title} (ID: ${response.data.id})`, 'yellow');
};

const testGetListings = async () => {
  const response = await axios.get(`${BASE_URL}/listings`);
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (!Array.isArray(response.data.listings)) {
    throw new Error('Response data should contain listings array');
  }
  
  log(`  Retrieved ${response.data.listings.length} listings`, 'yellow');
};

const testGetListingById = async () => {
  if (!global.testListing) {
    throw new Error('No test listing available');
  }
  
  const response = await axios.get(`${BASE_URL}/listings/${global.testListing.id}`);
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (response.data.id !== global.testListing.id) {
    throw new Error('Retrieved listing ID does not match');
  }
  
  log(`  Retrieved listing by ID: ${response.data.title}`, 'yellow');
};

const testSendRequest = async () => {
  if (!global.authToken || !global.testListing) {
    throw new Error('Missing auth token or test listing');
  }
  
  const request = {
    receiverId: global.testListing.user_id,
    listingId: global.testListing.id,
    message: 'I am interested in this opportunity. Let me know if you would like to discuss further.'
  };
  
  const response = await axios.post(`${BASE_URL}/requests`, request, {
    headers: { Authorization: `Bearer ${global.authToken}` }
  });
  
  if (response.status !== 201) {
    throw new Error(`Expected status 201, got ${response.status}`);
  }
  
  if (!response.data.id) {
    throw new Error('No request ID in response');
  }
  
  global.testRequest = response.data;
  
  log(`  Sent request to listing owner (Request ID: ${response.data.id})`, 'yellow');
};

const testGetRequests = async () => {
  if (!global.testUserToken) {
    throw new Error('No test user token available');
  }
  
  const response = await axios.get(`${BASE_URL}/requests`, {
    headers: { Authorization: `Bearer ${global.testUserToken}` }
  });
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (!Array.isArray(response.data.requests)) {
    throw new Error('Response should contain requests array');
  }
  
  log(`  Retrieved ${response.data.requests.length} requests`, 'yellow');
};

const testInvalidLogin = async () => {
  try {
    await axios.post(`${BASE_URL}/auth/login`, {
      email: 'invalid@example.com',
      password: 'wrongpassword'
    });
    throw new Error('Expected login to fail with invalid credentials');
  } catch (error) {
    if (error.response && error.response.status === 401) {
      log(`  Correctly rejected invalid credentials`, 'yellow');
      return;
    }
    throw error;
  }
};

const testUnauthorizedAccess = async () => {
  try {
    await axios.get(`${BASE_URL}/profile`);
    throw new Error('Expected unauthorized access to fail');
  } catch (error) {
    if (error.response && error.response.status === 401) {
      log(`  Correctly blocked unauthorized access`, 'yellow');
      return;
    }
    throw error;
  }
};

// Main test runner
const runAllTests = async () => {
  log('🚀 Starting Football Marketplace Backend Tests', 'blue');
  log('='.repeat(50), 'blue');
  
  // Authentication tests
  log('\n📋 Authentication Tests', 'magenta');
  await runTest('Admin Login', testAdminLogin);
  await runTest('User Registration', testUserRegistration);
  await runTest('Invalid Login', testInvalidLogin);
  await runTest('Unauthorized Access', testUnauthorizedAccess);
  
  // Profile tests
  log('\n👤 Profile Tests', 'magenta');
  await runTest('Get Profile', testGetProfile);
  
  // Listing tests
  log('\n📝 Listing Tests', 'magenta');
  await runTest('Create Listing', testCreateListing);
  await runTest('Get All Listings', testGetListings);
  await runTest('Get Listing By ID', testGetListingById);
  
  // Request tests
  log('\n📨 Request Tests', 'magenta');
  await runTest('Send Request', testSendRequest);
  await runTest('Get Requests', testGetRequests);
  
  // Summary
  log('\n📊 Test Results Summary', 'blue');
  log('='.repeat(50), 'blue');
  log(`Total Tests: ${testResults.passed + testResults.failed}`, 'cyan');
  log(`Passed: ${testResults.passed}`, 'green');
  log(`Failed: ${testResults.failed}`, testResults.failed > 0 ? 'red' : 'green');
  
  if (testResults.failed > 0) {
    log('\n❌ Failed Tests:', 'red');
    testResults.tests
      .filter(test => test.status === 'FAILED')
      .forEach(test => {
        log(`  • ${test.name}: ${test.error}`, 'red');
      });
  }
  
  log(`\n${testResults.failed === 0 ? '🎉 All tests passed!' : '⚠️ Some tests failed'}`, 
       testResults.failed === 0 ? 'green' : 'yellow');
};

// Handle graceful shutdown
process.on('SIGINT', () => {
  log('\n\n🛑 Tests interrupted by user', 'yellow');
  process.exit(0);
});

// Check if axios is available
if (typeof axios === 'undefined') {
  log('❌ axios is required for testing. Install it with: npm install axios', 'red');
  process.exit(1);
}

// Run tests
runAllTests().catch(error => {
  log(`\n💥 Test runner crashed: ${error.message}`, 'red');
  process.exit(1);
});
