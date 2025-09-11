const mysql = require('mysql2/promise');

async function checkUserTable() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'simo1234',
      database: 'football_marketplace'
    });

    console.log('📋 Users table structure:');
    const [columns] = await connection.execute('DESCRIBE users');
    
    columns.forEach(col => {
      console.log(`${col.Field}: ${col.Type} ${col.Null} ${col.Key} ${col.Default}`);
    });

    await connection.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkUserTable();
