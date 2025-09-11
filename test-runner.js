#!/usr/bin/env node

/**
 * Test Runner Script for Message and Admin Dashboard APIs
 * 
 * This script runs comprehensive tests for:
 * - Chat/Messaging API endpoints
 * - Admin Dashboard API endpoints
 * - Error handling and edge cases
 * - Pagination and performance
 * 
 * Usage:
 *   node test-runner.js
 *   npm run test-api
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Football Marketplace API Test Runner\n'.rainbow);

// Check if required dependencies are installed
try {
  require('axios');
  require('colors');
} catch (error) {
  console.error('❌ Required dependencies not found. Please run:'.red);
  console.error('   npm install axios colors --save-dev'.yellow);
  process.exit(1);
}

// Run the test script
const testScript = path.join(__dirname, 'test-message-admin-api.js');

console.log('🚀 Starting test execution...\n');

const testProcess = spawn('node', [testScript], {
  stdio: 'inherit',
  cwd: __dirname
});

testProcess.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ All tests completed successfully!'.green);
  } else {
    console.log(`\n❌ Tests failed with exit code ${code}`.red);
  }
  process.exit(code);
});

testProcess.on('error', (error) => {
  console.error('❌ Failed to start test process:', error.message.red);
  process.exit(1);
});
