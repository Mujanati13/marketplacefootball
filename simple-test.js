const https = require('http');
const querystring = require('querystring');

// Simple HTTP client for testing
const makeRequest = (options, data = null) => {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsedBody = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, data: parsedBody, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: body, headers: res.headers });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
};

// Test configuration
const BASE_URL = 'localhost';
const PORT = 3000;
let authToken = null;

// Test functions
const testLogin = async () => {
  console.log('🔐 Testing Admin Login...');
  
  const options = {
    hostname: BASE_URL,
    port: PORT,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const loginData = {
    email: 'admin@footballmarketplace.com',
    password: 'admin123'
  };

  try {
    const response = await makeRequest(options, loginData);
    
    if (response.status === 200 && response.data.accessToken) {
      authToken = response.data.accessToken;
      console.log('✅ Login successful!');
      console.log(`   User: ${response.data.user.email} (${response.data.user.role})`);
      console.log(`   Token: ${authToken.substring(0, 20)}...`);
      return true;
    } else {
      console.log('❌ Login failed:', response.data);
      return false;
    }
  } catch (error) {
    console.log('❌ Login error:', error.message);
    return false;
  }
};

const testProfile = async () => {
  if (!authToken) {
    console.log('❌ No auth token for profile test');
    return false;
  }

  console.log('👤 Testing Get Profile...');
  
  const options = {
    hostname: BASE_URL,
    port: PORT,
    path: '/api/auth/me',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    }
  };

  try {
    const response = await makeRequest(options);
    
    if (response.status === 200) {
      console.log('✅ Profile retrieved successfully!');
      console.log(`   User ID: ${response.data.user.id}`);
      return true;
    } else {
      console.log('❌ Profile test failed:', response.status, response.data);
      return false;
    }
  } catch (error) {
    console.log('❌ Profile error:', error.message);
    return false;
  }
};

const testListings = async () => {
  console.log('📝 Testing Get Listings...');
  
  const options = {
    hostname: BASE_URL,
    port: PORT,
    path: '/api/listings',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  try {
    const response = await makeRequest(options);
    
    if (response.status === 200) {
      console.log('✅ Listings retrieved successfully!');
      console.log(`   Total listings: ${response.data.listings ? response.data.listings.length : 0}`);
      return true;
    } else {
      console.log('❌ Listings test failed:', response.status, response.data);
      return false;
    }
  } catch (error) {
    console.log('❌ Listings error:', error.message);
    return false;
  }
};

const testHealth = async () => {
  console.log('🏥 Testing Health Check...');
  
  const options = {
    hostname: BASE_URL,
    port: PORT,
    path: '/health',
    method: 'GET'
  };

  try {
    const response = await makeRequest(options);
    
    if (response.status === 200) {
      console.log('✅ Health check passed!');
      console.log(`   Status: ${response.data.status}`);
      console.log(`   Database: ${response.data.database}`);
      console.log(`   Environment: ${response.data.environment}`);
      return true;
    } else {
      console.log('❌ Health check failed:', response.status, response.data);
      return false;
    }
  } catch (error) {
    console.log('❌ Health check error:', error.message);
    return false;
  }
};

// Main test runner
const runTests = async () => {
  console.log('🚀 Football Marketplace API Tests');
  console.log('=====================================\n');

  const results = {
    passed: 0,
    total: 0
  };

  // Run tests
  const tests = [
    { name: 'Health Check', fn: testHealth },
    { name: 'Admin Login', fn: testLogin },
    { name: 'Get Profile', fn: testProfile },
    { name: 'Get Listings', fn: testListings }
  ];

  for (const test of tests) {
    results.total++;
    const success = await test.fn();
    if (success) results.passed++;
    console.log(''); // Add spacing
  }

  // Summary
  console.log('=====================================');
  console.log('📊 Test Results Summary');
  console.log(`Passed: ${results.passed}/${results.total}`);
  
  if (results.passed === results.total) {
    console.log('🎉 All tests passed! Your API is working correctly.');
  } else {
    console.log('⚠️ Some tests failed. Check the output above for details.');
  }
};

// Run the tests
runTests().catch(error => {
  console.error('💥 Test runner crashed:', error);
  process.exit(1);
});
