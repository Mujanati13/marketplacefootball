const axios = require('axios');

// Configuration// Test helper function
async function testEndpoint(name, testFunction) {
  try {
    logInfo(`🔍 Testing: ${name}`);
    await testFunction();
    logSuccess(`${name} - PASSED`);
    return true;
  } catch (error) {
    logError(`${name} - FAILED: ${error.message}`);
    if (error.response) {
      logError(`Status: ${error.response.status}`);
      logError(`Response: ${JSON.stringify(error.response.data, null, 2)}`);
    } else if (error.request) {
      logError(`Request failed: ${error.request}`);
    } else {
      logError(`Error details: ${error.stack}`);
    }
    return false;
  }
}

// Configuration
const BASE_URL = 'http://localhost:3000/api';
const TEST_EMAIL = `test${Date.now()}@example.com`;
const TEST_PASSWORD = 'Password123!'; // Strong password with uppercase, lowercase, number and special char
const ADMIN_EMAIL = 'admin@footballmarketplace.com';
const ADMIN_PASSWORD = 'Admin123!';

let authToken = '';
let adminToken = '';
let testUserId = '';
let secondUserId = '';
let testListingId = '';
let testRequestId = '';
let testMeetingId = '';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logSection(message) {
  log(`\n🔍 ${message}`, 'cyan');
  log('='.repeat(50), 'cyan');
}

// Test helper function
async function testEndpoint(name, testFn) {
  try {
    await testFn();
    logSuccess(`${name} - PASSED`);
    return true;
  } catch (error) {
    logError(`${name} - FAILED: ${error.message}`);
    if (error.response) {
      logError(`Status: ${error.response.status}`);
      logError(`Response: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    return false;
  }
}

// 1. Authentication Tests
async function testAuth() {
  logSection('Authentication Tests');
  
  let passed = 0;
  let total = 0;

  // Test user registration
  total++;
  if (await testEndpoint('User Registration', async () => {
    const response = await axios.post(`${BASE_URL}/auth/register`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      name: 'Test User', // Add name field
      role: 'player'
    });
    
    if (response.status !== 201) {
      throw new Error(`Expected status 201, got ${response.status}`);
    }
    
    testUserId = response.data.user.id;
    authToken = response.data.accessToken;
    logInfo(`User ID: ${testUserId}, Token: ${authToken.substring(0, 20)}...`);
    
    return response;
  })) {
    passed++;
  }

  // Test user login
  total++;
  if (await testEndpoint('User Login', async () => {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    authToken = response.data.accessToken;
    logInfo(`New token: ${authToken.substring(0, 20)}...`);
  })) passed++;

  // Test admin login
  total++;
  if (await testEndpoint('Admin Login', async () => {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    adminToken = response.data.accessToken;
    logInfo(`Admin token: ${adminToken.substring(0, 20)}...`);
  })) passed++;

  // Test profile access
  total++;
  if (await testEndpoint('Get Current User Profile', async () => {
    const response = await axios.get(`${BASE_URL}/users/profile`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    logInfo(`Profile: ${response.data.email}`);
  })) passed++;

  logInfo(`Authentication Tests: ${passed}/${total} passed\n`);
  return { passed, total };
}

// 2. Listings Tests
async function testListings() {
  logSection('Listings Tests');
  
  let passed = 0;
  let total = 0;

  // Test create listing
  total++;
  if (await testEndpoint('Create Listing', async () => {
    const response = await axios.post(`${BASE_URL}/listings`, {
      title: 'Test Player Seeking Team',
      description: 'Test description for a player seeking a team',
      type: 'player',
      price: 50,
      currency: 'USD'
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.status !== 201) {
      throw new Error(`Expected status 201, got ${response.status}`);
    }
    
    testListingId = response.data.listing.id;
    logInfo(`Listing ID: ${testListingId}`);
    
    return response;
  })) {
    passed++;
  }

  // Test get all listings
  total++;
  if (await testEndpoint('Get All Listings', async () => {
    const response = await axios.get(`${BASE_URL}/listings`);
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    logInfo(`Found ${response.data.listings.length} listings`);
  })) passed++;

  // Test get listing by ID
  total++;
  if (await testEndpoint('Get Listing by ID', async () => {
    const response = await axios.get(`${BASE_URL}/listings/${testListingId}`);
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    logInfo(`Listing title: ${response.data.listing.title}`);
  })) passed++;

  // Test update listing
  total++;
  if (await testEndpoint('Update Listing', async () => {
    const response = await axios.put(`${BASE_URL}/listings/${testListingId}`, {
      title: 'Updated Test Player Seeking Team',
      description: 'Updated description',
      type: 'player',
      price: 75
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    logInfo(`Updated listing title: ${response.data.listing.title}`);
  })) passed++;

  logInfo(`Listings Tests: ${passed}/${total} passed\n`);
  return { passed, total };
}

// 3. Requests Tests
async function testRequests() {
  logSection('Requests Tests');
  
  let passed = 0;
  let total = 0;

  // Create a second user to send requests
  let secondUserToken = '';
  total++;
  if (await testEndpoint('Create Second User for Requests', async () => {
    const response = await axios.post(`${BASE_URL}/auth/register`, {
      email: `test2${Date.now()}@example.com`,
      password: TEST_PASSWORD,
      name: 'Test User 3', // Add name field
      role: 'coach'
    });
    
    if (response.status !== 201) {
      throw new Error(`Expected status 201, got ${response.status}`);
    }
    
    secondUserToken = response.data.accessToken;
    secondUserId = response.data.user.id;
    logInfo(`Second user ID: ${secondUserId}, Token: ${secondUserToken.substring(0, 20)}...`);
    
    return response;
  })) {
    passed++;
  }

  // Test create request
  total++;
  if (await testEndpoint('Create Request', async () => {
    const response = await axios.post(`${BASE_URL}/requests`, {
      target_user_id: testUserId,
      listing_id: testListingId || 1, // Use a default listing ID if none exists
      type: 'hire',
      message: 'I would like to hire you for this position'
    }, {
      headers: { Authorization: `Bearer ${secondUserToken}` }
    });
    
    if (response.status !== 201) {
      throw new Error(`Expected status 201, got ${response.status}`);
    }
    
    testRequestId = response.data.request.id;
    logInfo(`Request ID: ${testRequestId}`);
  })) passed++;

  // Test get sent requests
  total++;
  if (await testEndpoint('Get Sent Requests', async () => {
    const response = await axios.get(`${BASE_URL}/requests/my/sent`, {
      headers: { Authorization: `Bearer ${secondUserToken}` }
    });
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    logInfo(`Found ${response.data.requests.length} sent requests`);
  })) passed++;

  // Test get received requests
  total++;
  if (await testEndpoint('Get Received Requests', async () => {
    const response = await axios.get(`${BASE_URL}/requests/my/received`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    logInfo(`Found ${response.data.requests.length} received requests`);
  })) passed++;

  // Test update request status
  total++;
  if (await testEndpoint('Accept Request', async () => {
    const response = await axios.patch(`${BASE_URL}/requests/${testRequestId}/respond`, {
      status: 'accepted'
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    logInfo(`Request status updated to: ${response.data.request.status}`);
  })) passed++;

  logInfo(`Requests Tests: ${passed}/${total} passed\n`);
  return { passed, total };
}

// 4. Meetings Tests
async function testMeetings() {
  logSection('Meetings Tests');
  
  let passed = 0;
  let total = 0;

  // Test create meeting
  total++;
  if (await testEndpoint('Create Meeting', async () => {
    const startTime = new Date();
    startTime.setDate(startTime.getDate() + 1); // Tomorrow
    const endTime = new Date(startTime);
    endTime.setHours(startTime.getHours() + 1); // 1 hour later
    
    const response = await axios.post(`${BASE_URL}/meetings`, {
      request_id: testRequestId,
      coach_user_id: secondUserId, // Use second user as coach
      player_user_id: testUserId,  // Use first user as player
      start_at: startTime.toISOString(),
      end_at: endTime.toISOString(),
      location_uri: 'https://meet.example.com/test',
      notes: 'Test meeting notes'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    if (response.status !== 201) {
      throw new Error(`Expected status 201, got ${response.status}`);
    }
    
    testMeetingId = response.data.meeting.id;
    logInfo(`Meeting ID: ${testMeetingId}`);
  })) passed++;

  // Test get meetings
  total++;
  if (await testEndpoint('Get Meetings', async () => {
    const response = await axios.get(`${BASE_URL}/meetings`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    logInfo(`Found ${response.data.meetings.length} meetings`);
  })) passed++;

  // Test get meeting by ID
  total++;
  if (await testEndpoint('Get Meeting by ID', async () => {
    const response = await axios.get(`${BASE_URL}/meetings/${testMeetingId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    logInfo(`Meeting title: ${response.data.meeting.title}`);
  })) passed++;

  // Test update meeting
  total++;
  if (await testEndpoint('Update Meeting Status', async () => {
    const response = await axios.put(`${BASE_URL}/meetings/${testMeetingId}`, {
      status: 'inProgress'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    logInfo(`Meeting status updated to: ${response.data.meeting.status}`);
  })) passed++;

  logInfo(`Meetings Tests: ${passed}/${total} passed\n`);
  return { passed, total };
}

// 5. Profiles Tests
async function testProfiles() {
  logSection('Profiles Tests');
  
  let passed = 0;
  let total = 0;

  // Test create profile
  total++;
  if (await testEndpoint('Create Profile', async () => {
    const response = await axios.post(`${BASE_URL}/profiles`, {
      type: 'player',
      bio: 'Test bio for player profile',
      location: 'Test City',
      years_experience: 2,
      hourly_rate: 50.0,
      currency: 'USD',
      positions: ['midfielder'],
      skills: ['passing', 'shooting'],
      tags: ['competitive', 'team-player']
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.status !== 201) {
      throw new Error(`Expected status 201, got ${response.status}`);
    }
    
    logInfo(`Profile created for type: ${response.data.profile.type}`);
  })) passed++;

  // Test get profiles
  total++;
  if (await testEndpoint('Get All Profiles', async () => {
    const response = await axios.get(`${BASE_URL}/profiles/players`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    logInfo(`Found ${response.data.players.length} profiles`);
  })) passed++;

  logInfo(`Profiles Tests: ${passed}/${total} passed\n`);
  return { passed, total };
}

// Main test runner
async function runAllTests() {
  logSection('Football Marketplace API Test Suite');
  log('Starting comprehensive API testing...', 'blue');
  
  const results = {
    auth: { passed: 0, total: 0 },
    listings: { passed: 0, total: 0 },
    requests: { passed: 0, total: 0 },
    meetings: { passed: 0, total: 0 },
    profiles: { passed: 0, total: 0 }
  };

  // Check if server is running
  try {
    await axios.get(`${BASE_URL.replace('/api', '')}/health`);
    logSuccess('Server is running');
  } catch (error) {
    logError('Server is not running! Please start the server first.');
    logInfo('Run: npm run dev');
    process.exit(1);
  }

  // Run all test suites
  results.auth = await testAuth();
  results.listings = await testListings();
  results.requests = await testRequests();
  results.meetings = await testMeetings();
  results.profiles = await testProfiles();

  // Calculate totals
  const totalPassed = Object.values(results).reduce((sum, r) => sum + r.passed, 0);
  const totalTests = Object.values(results).reduce((sum, r) => sum + r.total, 0);
  
  // Print summary
  logSection('Test Summary');
  Object.entries(results).forEach(([suite, result]) => {
    const status = result.passed === result.total ? '✅' : '❌';
    log(`${status} ${suite.toUpperCase()}: ${result.passed}/${result.total}`, 
        result.passed === result.total ? 'green' : 'red');
  });
  
  log(`\n🎯 OVERALL: ${totalPassed}/${totalTests} tests passed`, 
      totalPassed === totalTests ? 'green' : 'red');
  
  if (totalPassed === totalTests) {
    logSuccess('🎉 All tests passed! API is working correctly.');
  } else {
    logError('❌ Some tests failed. Please check the errors above.');
  }
  
  process.exit(totalPassed === totalTests ? 0 : 1);
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  logError(`Unhandled error: ${error.message}`);
  process.exit(1);
});

// Run the tests
if (require.main === module) {
  runAllTests();
}

module.exports = { runAllTests };
