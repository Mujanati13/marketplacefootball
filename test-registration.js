const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

// Test data with valid password format
const testUsers = [
  {
    email: 'test1@gmail.com',
    password: 'Test123456',  // Valid: has uppercase, lowercase, and number
    name: 'Test User One',
    role: 'player'
  },
  {
    email: 'test2@gmail.com', 
    password: 'Player123',   // Valid: has uppercase, lowercase, and number
    name: 'Test User Two',
    role: 'coach'
  },
  {
    email: 'invalid@test.com',
    password: 'simo1234',    // Invalid: no uppercase letter
    name: 'Invalid User',
    role: 'player'
  }
];

async function testRegistration() {
  console.log('🧪 Testing Registration API Endpoint\n');
  
  for (let i = 0; i < testUsers.length; i++) {
    const user = testUsers[i];
    console.log(`Test ${i + 1}: Registering ${user.email}`);
    console.log(`Password: ${user.password}`);
    console.log(`Expected: ${i < 2 ? 'SUCCESS' : 'FAILURE (invalid password)'}`);
    
    try {
      const response = await axios.post(`${BASE_URL}/auth/register`, user);
      
      if (response.status === 201) {
        console.log('✅ Registration successful');
        console.log(`   User ID: ${response.data.user.id}`);
        console.log(`   Name: ${response.data.user.name}`);
        console.log(`   Role: ${response.data.user.role}`);
        console.log(`   Token received: ${response.data.accessToken ? 'Yes' : 'No'}`);
      }
      
    } catch (error) {
      console.log('❌ Registration failed');
      
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Error: ${error.response.data.error}`);
        
        if (error.response.data.details) {
          console.log('   Validation errors:');
          error.response.data.details.forEach(detail => {
            console.log(`     - ${detail.path}: ${detail.msg}`);
          });
        }
      } else {
        console.log(`   Network error: ${error.message}`);
      }
    }
    
    console.log(''); // Empty line for readability
  }
}

async function main() {
  try {
    await testRegistration();
  } catch (error) {
    console.error('Test script error:', error.message);
  }
}

if (require.main === module) {
  main();
}

module.exports = { testRegistration };
