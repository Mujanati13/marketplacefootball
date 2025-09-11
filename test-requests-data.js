#!/usr/bin/env node

const axios = require('axios');

// Test script to check requests data structure
async function testRequestsData() {
  const baseURL = 'http://localhost:3000';
  
  try {
    console.log('🧪 Testing Requests Data...');
    
    const response = await axios.get(`${baseURL}/api/requests/my/received`, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoiYWRtaW5AZm9vdGJhbGxtYXJrZXRwbGFjZS5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NTc1MzA0MDYsImV4cCI6MTc1NzUzNDAwNn0.ZSCnt3zDeXrnxyYHL2pIHOnlXuwuMtkJMZDcG6IgMdI'
      }
    });
    
    console.log('✅ Success! Status:', response.status);
    console.log('📥 Response Data:', JSON.stringify(response.data, null, 2));
    
    // Check if customer data is properly formatted
    if (response.data && response.data.data && response.data.data.length > 0) {
      const firstRequest = response.data.data[0];
      console.log('\n🔍 First Request Structure:');
      console.log('- ID:', firstRequest.id);
      console.log('- Customer ID:', firstRequest.customerId);
      console.log('- Customer Object:', firstRequest.customer);
      
      if (firstRequest.customer) {
        console.log('- Customer First Name:', firstRequest.customer.firstName);
        console.log('- Customer Last Name:', firstRequest.customer.lastName);
      } else {
        console.log('❌ Customer object is missing!');
      }
    }
    
  } catch (error) {
    if (error.response) {
      console.log('❌ API Error:', error.response.status);
      console.log('📥 Error Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('❌ Network Error:', error.message);
    }
  }
}

testRequestsData().catch(console.error);
