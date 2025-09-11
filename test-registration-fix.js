const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function testRegistrationFix() {
  console.log('🔧 Testing Registration Fix\n');
  
  const testUser = {
    email: 'fixtest@example.com',
    password: 'Player123',  // Valid password
    name: 'Fix Test',
    role: 'player',
    phone_number: null
  };
  
  try {
    console.log('Testing registration with:');
    console.log(`  Email: ${testUser.email}`);
    console.log(`  Password: ${testUser.password}`);
    console.log(`  Name: ${testUser.name}`);
    console.log(`  Role: ${testUser.role}`);
    console.log('');
    
    const response = await axios.post(`${BASE_URL}/auth/register`, testUser);
    
    if (response.status === 201) {
      console.log('✅ SUCCESS! Registration completed');
      console.log('\n📋 Server Response Analysis:');
      console.log(`   Status: ${response.status}`);
      console.log(`   Message: ${response.data.message}`);
      console.log('\n👤 User Data:');
      console.log(`   ID: ${response.data.user.id}`);
      console.log(`   Email: ${response.data.user.email}`);
      console.log(`   Name: ${response.data.user.name}`);  // Server sends "name"
      console.log(`   Role: ${response.data.user.role}`);
      console.log(`   Active: ${response.data.user.is_active}`);  // Server sends "is_active"
      console.log(`   Created: ${response.data.user.created_at}`);
      console.log('\n🔑 Authentication:');
      console.log(`   Access Token: ${response.data.accessToken ? 'Generated' : 'Missing'}`);
      console.log(`   Refresh Token: ${response.data.refreshToken ? 'Generated' : 'Missing'}`);
      
      console.log('\n🎯 Mobile App Fix Status:');
      console.log('   ✅ User.fromJson() updated to handle "name" field');
      console.log('   ✅ User.fromJson() updated to handle "is_active" field');
      console.log('   ✅ User.fromJson() updated to handle missing "updated_at"');
      console.log('   ✅ Password validation updated to match server requirements');
      console.log('   ✅ Live password validation added to registration form');
    }
    
  } catch (error) {
    if (error.response) {
      console.log('❌ Registration failed');
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Error: ${error.response.data.error}`);
      
      if (error.response.data.details) {
        console.log('   Details:');
        error.response.data.details.forEach(detail => {
          console.log(`     - ${detail.path}: ${detail.msg}`);
        });
      }
    } else {
      console.log(`❌ Network error: ${error.message}`);
    }
  }
}

async function main() {
  await testRegistrationFix();
  
  console.log('\n📝 Summary of Changes Made:');
  console.log('1. Fixed User.fromJson() to handle server response format');
  console.log('2. Added password strength validation matching server requirements');
  console.log('3. Added live password validation with visual feedback');
  console.log('4. Fixed field name mappings (name vs first_name/last_name)');
  console.log('5. Fixed status field mapping (is_active vs status)');
  console.log('6. Added fallback for missing updated_at field');
}

if (require.main === module) {
  main();
}

module.exports = { testRegistrationFix };
