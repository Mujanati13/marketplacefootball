const https = require('http');

// Simple direct listing test
const testListingsDirectly = () => {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/listings?page=1&limit=5',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const req = https.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
      console.log('Status:', res.statusCode);
      console.log('Response:', body);
    });
  });

  req.on('error', (error) => {
    console.error('Request error:', error);
  });

  req.end();
};

console.log('Testing listings endpoint directly...');
testListingsDirectly();
