#!/usr/bin/env node

const axios = require('axios');

// Test script for meeting creation API
async function testMeetingCreation() {
  const baseURL = 'http://localhost:3000';
  
  // Test data - using future times (at least 1 hour from now)
  const now = new Date();
  const futureStart = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
  const futureEnd = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
  
  const testData = {
    request_id: 5,
    coach_user_id: 1,
    player_user_id: 2,
    start_at: futureStart.toISOString(),
    end_at: futureEnd.toISOString(),
    location_uri: 'Test Location',
    notes: 'Test meeting notes'
  };

  try {
    console.log('🧪 Testing Meeting Creation API...');
    console.log('📤 Request Data:', JSON.stringify(testData, null, 2));
    
    const response = await axios.post(`${baseURL}/api/meetings`, testData, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoiYWRtaW5AZm9vdGJhbGxtYXJrZXRwbGFjZS5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NTc1MzA0MDYsImV4cCI6MTc1NzUzNDAwNn0.ZSCnt3zDeXrnxyYHL2pIHOnlXuwuMtkJMZDcG6IgMdI'
      }
    });
    
    console.log('✅ Success! Status:', response.status);
    console.log('📥 Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    if (error.response) {
      console.log('❌ API Error:', error.response.status);
      console.log('📥 Error Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('❌ Network Error:', error.message);
    }
  }
}

// Test with invalid times (same start and end)
async function testInvalidTimes() {
  const baseURL = 'http://localhost:3000';
  
  const invalidData = {
    request_id: 5,
    coach_user_id: 1,
    player_user_id: 2,
    start_at: '2025-09-10T19:36:00.000Z',
    end_at: '2025-09-10T19:36:00.000Z', // Same time - should fail
    location_uri: 'Test Location',
    notes: 'Test meeting notes'
  };

  try {
    console.log('\n🧪 Testing Invalid Time Validation...');
    console.log('📤 Request Data (Invalid):', JSON.stringify(invalidData, null, 2));
    
    const response = await axios.post(`${baseURL}/api/meetings`, invalidData, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoiYWRtaW5AZm9vdGJhbGxtYXJrZXRwbGFjZS5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NTc1MjY3NDYsImV4cCI6MTc1NzUzMDM0Nn0.G576OS1pgxbVRnO8fz_akQU3Ksn-454Av5tmYP9YJZU'
      }
    });
    
    console.log('🔥 Unexpected Success! This should have failed. Status:', response.status);
    
  } catch (error) {
    if (error.response) {
      console.log('✅ Expected Error! Status:', error.response.status);
      console.log('📥 Error Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('❌ Network Error:', error.message);
    }
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting Meeting Creation Tests\n');
  
  await testInvalidTimes();
  await testMeetingCreation();
  
  console.log('\n✨ Tests completed!');
}

runTests().catch(console.error);
