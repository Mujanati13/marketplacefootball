const fs = require('fs');
const path = require('path');

// Read the requests.js file
const filePath = path.join(__dirname, 'routes', 'requests.js');
let content = fs.readFileSync(filePath, 'utf8');

// Replace all instances of requester_user_id with sender_id
content = content.replace(/requester_user_id/g, 'sender_id');

// Write back to file
fs.writeFileSync(filePath, content);

console.log('✅ Fixed all requester_user_id references to sender_id in requests.js');
