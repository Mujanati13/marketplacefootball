const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

// Test data that matches mobile app registration flow
const mobileAppTestCases = [
  {
    description: 'Valid registration - matches mobile app format',
    data: {
      email: 'player1@test.com',
      password: 'Player123',  // Valid: uppercase + lowercase + number
      name: 'John Smith',     // Combined name as sent by mobile app
      role: 'player',
      phone_number: '+1234567890'
    },
    expectedResult: 'SUCCESS'
  },
  {
    description: 'Valid registration - coach with no phone',
    data: {
      email: 'coach1@test.com', 
      password: 'Coach456',
      name: 'Jane Doe',
      role: 'coach',
      phone_number: null
    },
    expectedResult: 'SUCCESS'
  },
  {
    description: 'Invalid - password too weak (no uppercase)',
    data: {
      email: 'invalid1@test.com',
      password: 'simo1234',  // This is what was failing in the mobile app
      name: 'Test User',
      role: 'player',
      phone_number: null
    },
    expectedResult: 'FAILURE - weak password'
  },
  {
    description: 'Invalid - password too short',
    data: {
      email: 'invalid2@test.com',
      password: 'Test1',     // Only 5 characters
      name: 'Test User',
      role: 'player',
      phone_number: null
    },
    expectedResult: 'FAILURE - too short'
  },
  {
    description: 'Invalid - missing name',
    data: {
      email: 'invalid3@test.com',
      password: 'Test123',
      name: '',              // Empty name
      role: 'player',
      phone_number: null
    },
    expectedResult: 'FAILURE - missing name'
  }
];

async function runMobileAppTests() {
  console.log('📱 Testing Mobile App Registration Flow\n');
  console.log('Password Requirements:');
  console.log('  - Minimum 8 characters');
  console.log('  - At least one lowercase letter');
  console.log('  - At least one uppercase letter');
  console.log('  - At least one number\n');
  
  for (let i = 0; i < mobileAppTestCases.length; i++) {
    const testCase = mobileAppTestCases[i];
    console.log(`Test ${i + 1}: ${testCase.description}`);
    console.log(`Email: ${testCase.data.email}`);
    console.log(`Password: "${testCase.data.password}"`);
    console.log(`Name: "${testCase.data.name}"`);
    console.log(`Expected: ${testCase.expectedResult}`);
    
    try {
      const response = await axios.post(`${BASE_URL}/auth/register`, testCase.data);
      
      if (response.status === 201) {
        console.log('✅ SUCCESS - Registration completed');
        console.log(`   User ID: ${response.data.user.id}`);
        console.log(`   Name: ${response.data.user.name}`);
        console.log(`   Role: ${response.data.user.role}`);
        console.log(`   Has Token: ${response.data.accessToken ? 'Yes' : 'No'}`);
        
        if (testCase.expectedResult.startsWith('FAILURE')) {
          console.log('⚠️  WARNING: Expected failure but got success!');
        }
      }
      
    } catch (error) {
      if (error.response) {
        console.log('❌ FAILURE - Validation error');
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Error: ${error.response.data.error || 'Unknown error'}`);
        
        if (error.response.data.details) {
          console.log('   Validation details:');
          error.response.data.details.forEach(detail => {
            console.log(`     • ${detail.path}: ${detail.msg}`);
          });
        }
        
        if (testCase.expectedResult.startsWith('SUCCESS')) {
          console.log('⚠️  WARNING: Expected success but got failure!');
        }
      } else {
        console.log(`❌ NETWORK ERROR: ${error.message}`);
      }
    }
    
    console.log(''.padEnd(60, '-'));
    console.log(''); // Empty line for readability
  }
}

async function main() {
  try {
    await runMobileAppTests();
    
    console.log('\n📋 Summary:');
    console.log('• The mobile app password validation has been updated to match server requirements');
    console.log('• Users must now enter passwords with uppercase, lowercase, and number');
    console.log('• Minimum password length is 8 characters');
    console.log('• Registration data format matches mobile app structure');
    
  } catch (error) {
    console.error('Test script error:', error.message);
  }
}

if (require.main === module) {
  main();
}

module.exports = { runMobileAppTests };
