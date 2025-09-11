const mysql = require('mysql2/promise');

async function createTestUsers() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'simo1234',
      database: 'football_marketplace'
    });

    console.log('➕ Creating additional test users for mobile testing...');

    // Create another coach
    await connection.execute(`
      INSERT IGNORE INTO users (id, name, email, password_hash, role, is_active, created_at, updated_at)
      VALUES (4, 'Coach Test 2', 'coach2@test.com', '$2b$10$hashedpassword', 'coach', true, NOW(), NOW())
    `);

    // Create another player
    await connection.execute(`
      INSERT IGNORE INTO users (id, name, email, password_hash, role, is_active, created_at, updated_at)
      VALUES (5, 'Player Test 2', 'player2@test.com', '$2b$10$hashedpassword', 'player', true, NOW(), NOW())
    `);

    console.log('✅ Test users created successfully');

    // Show all users
    const [users] = await connection.execute(
      'SELECT id, name, email, role FROM users ORDER BY id'
    );
    
    console.log('\n👥 All Users:');
    users.forEach(user => {
      console.log(`ID: ${user.id}, Name: ${user.name}, Email: ${user.email}, Role: ${user.role}`);
    });

    await connection.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

createTestUsers();
