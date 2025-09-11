const mysql = require('mysql2/promise');

async function testListingsQuery() {
  try {
    const dbConnection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'simo1234',
      database: 'football_marketplace'
    });
    
    console.log('Connected to database');
    
    // Test simple query first
    const simpleQuery = `
      SELECT l.*, 
             CONCAT(p.first_name, ' ', p.last_name) as owner_name, 
             p.avatar_url as owner_avatar,
             p.location, p.experience_level, u.email as owner_email
      FROM listings l
      JOIN users u ON l.user_id = u.id
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE l.is_active = true AND u.status = 'active'
      ORDER BY l.created_at DESC
      LIMIT 5 OFFSET 0
    `;
    
    console.log('Testing query without parameters...');
    const result = await dbConnection.execute(simpleQuery);
    console.log('Success! Found', result[0].length, 'listings');
    
    // Test with parameters
    console.log('Testing query with parameters...');
    const paramQuery = `SELECT l.*, CONCAT(p.first_name, ' ', p.last_name) as owner_name, p.avatar_url as owner_avatar, p.location, p.experience_level, u.email as owner_email FROM listings l JOIN users u ON l.user_id = u.id LEFT JOIN profiles p ON u.id = p.user_id WHERE l.is_active = true AND u.status = 'active' ORDER BY l.created_at DESC LIMIT ? OFFSET ?`;
    
    const params = [5, 0];
    console.log('Parameters:', params);
    console.log('Parameter types:', params.map(p => typeof p));
    
    const result2 = await dbConnection.execute(paramQuery, params);
    console.log('Success! Found', result2[0].length, 'listings with parameters');
    
    if (result2[0].length > 0) {
      console.log('Sample listing:', {
        title: result2[0][0].title,
        owner_name: result2[0][0].owner_name,
        type: result2[0][0].type
      });
    }
    
    await dbConnection.end();
    
  } catch (error) {
    console.error('Query test error:', error.message);
    console.error('Full error:', error);
  }
}

testListingsQuery();
