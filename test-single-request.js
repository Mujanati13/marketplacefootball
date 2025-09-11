const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function testRequestCreation() {
  try {
    // First create two users
    console.log('Creating first user...');
    const user1 = await axios.post(`${BASE_URL}/auth/register`, {
      email: `test${Date.now()}@example.com`,
      password: 'Password123!',
      name: 'Test User 1',
      role: 'player'
    });
    console.log('User1 response:', JSON.stringify(user1.data, null, 2));
    
    console.log('Creating second user...');
    const user2 = await axios.post(`${BASE_URL}/auth/register`, {
      email: `test${Date.now() + 1}@example.com`,
      password: 'Password123!',
      name: 'Test User 2',
      role: 'coach'
    });
    console.log('User2 response:', JSON.stringify(user2.data, null, 2));

    // Create a listing with user2
    console.log('Creating listing...');
    const listing = await axios.post(`${BASE_URL}/listings`, {
      title: 'Test Coach Available',
      description: 'Professional coach',
      type: 'coach',
      price: 50,
      currency: 'USD'
    }, {
      headers: { Authorization: `Bearer ${user2.data.accessToken}` }
    });
    console.log('Listing created:', listing.data.listing.id);

    console.log('Creating request...');
    console.log('Request data:', {
      target_user_id: user2.data.user.id,
      listing_id: listing.data.listing.id,
      type: 'hire',
      message: 'I would like to hire you'
    });
    
    const request = await axios.post(`${BASE_URL}/requests`, {
      target_user_id: user2.data.user.id,
      listing_id: listing.data.listing.id,
      type: 'hire',
      message: 'I would like to hire you'
    }, {
      headers: { Authorization: `Bearer ${user1.data.accessToken}` }
    });

    console.log('✅ Request created successfully!');
    console.log('Request ID:', request.data.request.id);

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.data?.stack) {
      console.error('Stack:', error.response.data.stack);
    }
  }
}

testRequestCreation();
