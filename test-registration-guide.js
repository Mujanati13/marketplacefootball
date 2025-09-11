const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

// Example of what mobile users should enter for successful registration
const validExamples = {
  'Strong Password Examples': [
    'Player123',    // Simple and memorable
    'Coach2024',    // Year-based
    'Football99',   // Sport-themed
    'Soccer456',    // Another sport theme
    'Team2024!',    // With special character (allowed)
  ],
  
  'Invalid Password Examples (will fail)': [
    'simo1234',     // No uppercase letter
    'PLAYER123',    // No lowercase letter  
    'PlayerABC',    // No number
    'Player1',      // Too short (only 8 chars needed)
    '12345678',     // Only numbers
  ]
};

async function demonstrateValidRegistration() {
  console.log('📝 Mobile App Registration Guide\n');
  
  // Show password examples
  Object.keys(validExamples).forEach(category => {
    console.log(`${category}:`);
    validExamples[category].forEach(password => {
      const isValid = password.length >= 8 && 
                     /[a-z]/.test(password) && 
                     /[A-Z]/.test(password) && 
                     /\d/.test(password);
      console.log(`  ${isValid ? '✅' : '❌'} "${password}"`);
    });
    console.log('');
  });
  
  // Test one successful registration
  console.log('🧪 Testing Successful Registration:\n');
  
  const testUser = {
    email: 'demo@example.com',
    password: 'Player123',  // Valid password
    name: 'Demo User',
    role: 'player',
    phone_number: null
  };
  
  try {
    console.log('Attempting registration with:');
    console.log(`  Email: ${testUser.email}`);
    console.log(`  Password: ${testUser.password}`);
    console.log(`  Name: ${testUser.name}`);
    console.log(`  Role: ${testUser.role}`);
    
    const response = await axios.post(`${BASE_URL}/auth/register`, testUser);
    
    if (response.status === 201) {
      console.log('\n✅ SUCCESS! Registration completed');
      console.log(`   User ID: ${response.data.user.id}`);
      console.log(`   Name: ${response.data.user.name}`);
      console.log(`   Role: ${response.data.user.role}`);
      console.log(`   Email: ${response.data.user.email}`);
      console.log(`   Token Generated: Yes`);
    }
    
  } catch (error) {
    if (error.response) {
      console.log('\n❌ Registration failed');
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Error: ${error.response.data.error}`);
      
      if (error.response.data.details) {
        console.log('   Details:');
        error.response.data.details.forEach(detail => {
          console.log(`     - ${detail.path}: ${detail.msg}`);
        });
      }
    } else {
      console.log(`\n❌ Network error: ${error.message}`);
    }
  }
  
  console.log('\n📋 Quick Reference for Mobile Users:');
  console.log('Password must have:');
  console.log('  ✓ At least 8 characters');
  console.log('  ✓ One uppercase letter (A-Z)');
  console.log('  ✓ One lowercase letter (a-z)');
  console.log('  ✓ One number (0-9)');
  console.log('  ✓ Example: "Player123"');
}

if (require.main === module) {
  demonstrateValidRegistration();
}

module.exports = { demonstrateValidRegistration };
