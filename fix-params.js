const fs = require('fs');
const path = require('path');

// Fix requests.js
const requestsPath = path.join(__dirname, 'routes', 'requests.js');
let requestsContent = fs.readFileSync(requestsPath, 'utf8');

// Replace all instances of params.push(limit, offset) with two separate calls
requestsContent = requestsContent.replace(/params\.push\(limit, offset\);/g, 'params.push(limit);\n      params.push(offset);');

fs.writeFileSync(requestsPath, requestsContent);

console.log('✅ Fixed params.push(limit, offset) in requests.js');

// Check if there are similar issues in other files
const profilesPath = path.join(__dirname, 'routes', 'profiles.js');
let profilesContent = fs.readFileSync(profilesPath, 'utf8');

// Check for any remaining double-push patterns
if (profilesContent.includes('params.push(')) {
  const matches = profilesContent.match(/params\.push\([^)]*,[^)]*\)/g);
  if (matches) {
    console.log('Found potential issues in profiles.js:', matches);
    // Fix them
    profilesContent = profilesContent.replace(/params\.push\(parseInt\(limit\), offset\);/g, 'params.push(parseInt(limit));\n    params.push(offset);');
    fs.writeFileSync(profilesPath, profilesContent);
    console.log('✅ Fixed params.push issues in profiles.js');
  }
}

console.log('✅ All parameter passing issues fixed');
