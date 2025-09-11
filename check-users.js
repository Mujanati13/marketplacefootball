const mysql = require('mysql2/promise');

async function checkUsers() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'simo1234',
      database: 'football_marketplace'
    });

    console.log('👥 Available Users:');
    const [users] = await connection.execute(
      'SELECT id, name, email, role FROM users ORDER BY id'
    );
    
    users.forEach(user => {
      console.log(`ID: ${user.id}, Name: ${user.name}, Email: ${user.email}, Role: ${user.role}`);
    });

    await connection.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkUsers();
