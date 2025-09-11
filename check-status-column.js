const mysql = require('mysql2/promise');
const config = require('./config/database');

(async () => {
  try {
    const connection = await mysql.createConnection(config);
    const [rows] = await connection.execute('SHOW COLUMNS FROM meetings WHERE Field = "status"');
    console.log('Status column info:', JSON.stringify(rows, null, 2));
    await connection.end();
  } catch(e) {
    console.log('Error:', e.message);
  }
})();
