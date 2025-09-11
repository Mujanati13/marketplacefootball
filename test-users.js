const mysql = require('mysql2/promise');

// Simple database config for this utility
const DB_CONFIG = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'simo1234',
  database: 'football_marketplace'
};

async function showTestUsers() {
  console.log('📋 Test Users in Database\n');
  
  let connection;
  try {
    connection = await mysql.createConnection(DB_CONFIG);
    
    const [users] = await connection.execute(
      'SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC LIMIT 10'
    );
    
    console.log('Recent users (last 10):');
    console.log('ID | Email                        | Name          | Role   | Created');
    console.log('---|------------------------------|---------------|--------|------------------');
    
    users.forEach(user => {
      const date = new Date(user.created_at).toISOString().slice(0, 19).replace('T', ' ');
      console.log(
        `${user.id.toString().padStart(2)} | ${user.email.padEnd(28)} | ${user.name.padEnd(13)} | ${user.role.padEnd(6)} | ${date}`
      );
    });
    
    console.log('\n💡 Tips:');
    console.log('- Use a new email for testing registration');
    console.log('- test@gmail.com is already registered (will get 409 error)');
    console.log('- Password must be: 8+ chars, uppercase, lowercase, number');
    console.log('- Examples: Player123, Coach456, Football99');
    
  } catch (error) {
    console.error('Database error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

async function deleteTestUser(email) {
  console.log(`🗑️  Deleting user: ${email}\n`);
  
  let connection;
  try {
    connection = await mysql.createConnection(DB_CONFIG);
    
    const [result] = await connection.execute(
      'DELETE FROM users WHERE email = ?',
      [email]
    );
    
    if (result.affectedRows > 0) {
      console.log(`✅ User ${email} deleted successfully`);
    } else {
      console.log(`❌ User ${email} not found`);
    }
    
  } catch (error) {
    console.error('Database error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args[0] === 'delete' && args[1]) {
    await deleteTestUser(args[1]);
  } else if (args[0] === 'list' || args.length === 0) {
    await showTestUsers();
  } else {
    console.log('Usage:');
    console.log('  node test-users.js           - Show recent users');
    console.log('  node test-users.js list      - Show recent users');
    console.log('  node test-users.js delete user@example.com - Delete specific user');
  }
}

if (require.main === module) {
  main();
}

module.exports = { showTestUsers, deleteTestUser };
