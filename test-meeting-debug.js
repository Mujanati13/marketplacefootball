const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function testMeetingCreation() {
    try {
        console.log('=== Testing Meeting Creation ===\n');
        
        // First create a user
        console.log('1. Creating test user...');
        const userEmail = `testuser${Date.now()}@example.com`;
        const userResponse = await axios.post(`${BASE_URL}/auth/register`, {
            email: userEmail,
            password: 'Password123!',
            name: 'Test User',
            role: 'player'
        });
        const userToken = userResponse.data.accessToken;
        const userId = userResponse.data.user.id;
        console.log('✅ User created, ID:', userId);
        
        // Create a coach user
        console.log('2. Creating coach user...');
        const coachEmail = `coach${Date.now()}@example.com`;
        const coachResponse = await axios.post(`${BASE_URL}/auth/register`, {
            email: coachEmail,
            password: 'Password123!',
            name: 'Test Coach',
            role: 'coach'
        });
        const coachToken = coachResponse.data.accessToken;
        const coachId = coachResponse.data.user.id;
        console.log('✅ Coach created, ID:', coachId);
        
        // Create a listing
        console.log('3. Creating listing...');
        const listingResponse = await axios.post(`${BASE_URL}/listings`, {
            title: 'Test Listing for Meeting',
            description: 'Test description',
            type: 'player',
            price: 100
        }, {
            headers: { Authorization: `Bearer ${userToken}` }
        });
        const listingId = listingResponse.data.listing.id;
        console.log('✅ Listing created, ID:', listingId);
        
        // Create a request
        console.log('4. Creating request...');
        const requestResponse = await axios.post(`${BASE_URL}/requests`, {
            target_user_id: userId,
            listing_id: listingId,
            type: 'hire',
            message: 'Test request for meeting'
        }, {
            headers: { Authorization: `Bearer ${coachToken}` }
        });
        const requestId = requestResponse.data.request.id;
        console.log('✅ Request created, ID:', requestId);
        
        // Accept the request
        console.log('5. Accepting request...');
        await axios.patch(`${BASE_URL}/requests/${requestId}/respond`, {
            status: 'accepted'
        }, {
            headers: { Authorization: `Bearer ${userToken}` }
        });
        console.log('✅ Request accepted');
        
        // Login as admin
        console.log('6. Logging in as admin...');
        const adminLogin = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'admin@footballmarketplace.com',
            password: 'Admin123!'
        });
        
        const adminToken = adminLogin.data.accessToken;
        console.log('✅ Admin login successful');
        
        // Try to create a meeting
        console.log('7. Creating meeting...');
        
        const startTime = new Date();
        startTime.setDate(startTime.getDate() + 1);
        const endTime = new Date(startTime);
        endTime.setHours(startTime.getHours() + 1);
        
        const meetingData = {
            request_id: requestId,
            coach_user_id: coachId,
            player_user_id: userId,
            start_at: startTime.toISOString(),
            end_at: endTime.toISOString(),
            location_uri: 'https://meet.example.com/test',
            notes: 'Test meeting notes'
        };
        
        console.log('Meeting data:', meetingData);
        
        const response = await axios.post(`${BASE_URL}/meetings`, meetingData, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        
        console.log('✅ Meeting created successfully!');
        console.log('Response:', response.data);
        
    } catch (error) {
        console.log('❌ Error occurred:');
        console.log('Status:', error.response?.status);
        console.log('Message:', error.response?.data?.message || error.message);
        console.log('Full error:', error.response?.data || error.message);
        
        if (error.response?.data?.errors) {
            console.log('Validation errors:', error.response.data.errors);
        }
    }
}

testMeetingCreation();
