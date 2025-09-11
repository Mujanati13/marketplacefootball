const { query } = require('./config/database');

(async () => {
  try {
    console.log('Checking existing meeting statuses...');
    
    // Get all distinct status values
    const statuses = await query('SELECT DISTINCT status FROM meetings');
    console.log('Existing status values:', statuses);
    
    // Get meetings with different status counts
    const statusCounts = await query('SELECT status, COUNT(*) as count FROM meetings GROUP BY status');
    console.log('Status counts:', statusCounts);
    
  } catch(e) {
    console.log('Error:', e.message);
    console.log('Stack:', e.stack);
  }
})();
