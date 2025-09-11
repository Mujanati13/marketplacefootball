const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function testSimpleProfiles() {
    try {
        console.log('Testing profiles GET without any filters...');
        
        // Simple GET request without any query parameters
        const response = await axios.get(`${BASE_URL}/profiles/players`);
        
        console.log('✅ Simple profiles test PASSED');
        console.log('Response data:', response.data);
        return true;
    } catch (error) {
        console.log('❌ Simple profiles test FAILED');
        console.log('Error status:', error.response?.status);
        console.log('Error message:', error.response?.data?.message || error.message);
        console.log('Full error:', error.response?.data || error.message);
        return false;
    }
}

async function testProfilesWithFilters() {
    try {
        console.log('\nTesting profiles GET with simple filters...');
        
        // GET request with simple query parameters
        const response = await axios.get(`${BASE_URL}/profiles/players?location=test`);
        
        console.log('✅ Profiles with filters test PASSED');
        console.log('Response data:', response.data);
        return true;
    } catch (error) {
        console.log('❌ Profiles with filters test FAILED');
        console.log('Error status:', error.response?.status);
        console.log('Error message:', error.response?.data?.message || error.message);
        console.log('Full error:', error.response?.data || error.message);
        return false;
    }
}

async function runTests() {
    console.log('=== Testing Profiles GET Endpoint ===\n');
    
    const simpleTest = await testSimpleProfiles();
    const filterTest = await testProfilesWithFilters();
    
    console.log('\n=== Summary ===');
    console.log(`Simple GET: ${simpleTest ? 'PASSED' : 'FAILED'}`);
    console.log(`Filter GET: ${filterTest ? 'PASSED' : 'FAILED'}`);
}

runTests().catch(console.error);
