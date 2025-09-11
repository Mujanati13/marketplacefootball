const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function createDatabase() {
  try {
    // Connect without database first
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'simo1234'
    });
    
    console.log('Connected to MySQL server');
    
    // Create database
    await connection.execute('DROP DATABASE IF EXISTS football_marketplace');
    await connection.execute('CREATE DATABASE football_marketplace');
    console.log('Database dropped and recreated');
    
    // Close and reconnect to the specific database
    await connection.end();
    
    const dbConnection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'simo1234',
      database: 'football_marketplace'
    });
    
    // Create tables
    const tables = [
      `CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        avatar_url VARCHAR(500),
        phone VARCHAR(20),
        role ENUM('admin', 'player', 'coach', 'club_representative') NOT NULL,
        status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
        is_active BOOLEAN DEFAULT true,
        last_login_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS profiles (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        type ENUM('player', 'coach') NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        date_of_birth DATE,
        nationality VARCHAR(100),
        position VARCHAR(50),
        preferred_foot ENUM('left', 'right', 'both'),
        height DECIMAL(5,2),
        weight DECIMAL(5,2),
        experience_level ENUM('beginner', 'amateur', 'semi_professional', 'professional'),
        years_experience INT DEFAULT 0,
        bio TEXT,
        location VARCHAR(255),
        hourly_rate DECIMAL(10,2),
        currency VARCHAR(3) DEFAULT 'USD',
        positions JSON,
        skills JSON,
        tags JSON,
        media JSON,
        avatar_url VARCHAR(500),
        phone VARCHAR(20),
        achievements TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      
      `CREATE TABLE IF NOT EXISTS listings (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        type ENUM('player', 'coach') NOT NULL,
        price DECIMAL(10,2) DEFAULT 0,
        currency VARCHAR(3) DEFAULT 'USD',
        position VARCHAR(50),
        experience_level ENUM('beginner', 'amateur', 'semi_professional', 'professional'),
        location VARCHAR(255),
        salary_range VARCHAR(100),
        requirements TEXT,
        status ENUM('active', 'inactive', 'expired') DEFAULT 'active',
        is_active BOOLEAN DEFAULT true,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      
      `CREATE TABLE IF NOT EXISTS requests (
        id INT PRIMARY KEY AUTO_INCREMENT,
        sender_id INT NOT NULL,
        target_user_id INT NOT NULL,
        listing_id INT,
        type ENUM('buy', 'hire') NOT NULL,
        message TEXT,
        status ENUM('pending', 'accepted', 'rejected', 'cancelled') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE SET NULL
      )`,
      
      `CREATE TABLE IF NOT EXISTS meetings (
        id INT PRIMARY KEY AUTO_INCREMENT,
        request_id INT NOT NULL,
        coach_user_id INT NOT NULL,
        player_user_id INT NOT NULL,
        title VARCHAR(255),
        description TEXT,
        meeting_type ENUM('trial', 'interview', 'training_session', 'match', 'discussion') DEFAULT 'discussion',
        status ENUM('scheduled', 'inProgress', 'completed', 'cancelled') DEFAULT 'scheduled',
        start_at TIMESTAMP NOT NULL,
        end_at TIMESTAMP NOT NULL,
        location VARCHAR(255),
        location_uri VARCHAR(500),
        duration_minutes INT DEFAULT 60,
        notes TEXT,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE,
        FOREIGN KEY (coach_user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (player_user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
      )`,
      
      `CREATE TABLE IF NOT EXISTS conversations (
        id INT PRIMARY KEY AUTO_INCREMENT,
        title VARCHAR(255),
        type ENUM('deal', 'general', 'support') DEFAULT 'general',
        request_id INT,
        user1_id INT NOT NULL,
        user2_id INT NOT NULL,
        created_by_user_id INT NOT NULL,
        last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE SET NULL,
        FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_users (user1_id, user2_id)
      )`,
      
      `CREATE TABLE IF NOT EXISTS conversation_participants (
        id INT PRIMARY KEY AUTO_INCREMENT,
        conversation_id INT NOT NULL,
        user_id INT NOT NULL,
        role_in_conversation ENUM('member', 'admin') DEFAULT 'member',
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_conversation_user (conversation_id, user_id),
        INDEX idx_user_conversations (user_id, conversation_id)
      )`,
      
      `CREATE TABLE IF NOT EXISTS messages (
        id INT PRIMARY KEY AUTO_INCREMENT,
        conversation_id INT NOT NULL,
        sender_id INT NOT NULL,
        content TEXT NOT NULL,
        message_type ENUM('text', 'image', 'file', 'system') DEFAULT 'text',
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      
      `CREATE TABLE IF NOT EXISTS audit_logs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT,
        action VARCHAR(100) NOT NULL,
        table_name VARCHAR(100),
        record_id INT,
        old_values JSON,
        new_values JSON,
        ip_address VARCHAR(45),
        user_agent TEXT,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )`
    ];
    
    for (const tableSQL of tables) {
      await dbConnection.execute(tableSQL);
      console.log('Table created:', tableSQL.split('(')[0].replace('CREATE TABLE IF NOT EXISTS', '').trim());
    }
    
    // Create admin user
    const adminPassword = await bcrypt.hash('Admin123!', 10);
    
    await dbConnection.execute(
      `INSERT IGNORE INTO users (email, password_hash, name, first_name, last_name, role, status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['admin@footballmarketplace.com', adminPassword, 'Administrator', 'Admin', 'User', 'admin', 'active']
    );
    console.log('Admin user created (email: admin@footballmarketplace.com, password: Admin123!)');
    
    // Create test user for testing
    const testPassword = await bcrypt.hash('Test123!', 10);
    await dbConnection.execute(
      `INSERT IGNORE INTO users (email, password_hash, name, first_name, last_name, role, status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['testuser@test.com', testPassword, 'Test User', 'Test', 'User', 'player', 'active']
    );
    
    // Create coach user for testing
    await dbConnection.execute(
      `INSERT IGNORE INTO users (email, password_hash, name, first_name, last_name, role, status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['coach@test.com', testPassword, 'Coach Test', 'Coach', 'Test', 'coach', 'active']
    );
    
    // Add sample listings
    await dbConnection.execute(
      `INSERT IGNORE INTO listings (user_id, title, description, type, price, position, experience_level, location, status) VALUES
      (2, 'Professional Football Player Available', 'Experienced striker looking for new opportunities', 'player', 5000.00, 'striker', 'professional', 'London, UK', 'active'),
      (3, 'Football Coach Available', 'Certified coach with 10 years experience', 'coach', 100.00, 'coach', 'professional', 'Manchester, UK', 'active'),
      (2, 'Midfielder Seeking Team', 'Creative midfielder with excellent passing skills', 'player', 3000.00, 'midfielder', 'semi_professional', 'Birmingham, UK', 'active')`
    );
    
    // Add sample requests
    await dbConnection.execute(
      `INSERT IGNORE INTO requests (sender_id, target_user_id, listing_id, type, message, status) VALUES
      (1, 2, 1, 'hire', 'Interested in your football services', 'pending'),
      (1, 3, 2, 'hire', 'Would like to discuss coaching opportunities', 'accepted')`
    );
    
    // Add sample meetings
    await dbConnection.execute(
      `INSERT IGNORE INTO meetings (request_id, coach_user_id, player_user_id, title, description, meeting_type, status, start_at, end_at, location, created_by) VALUES
      (2, 3, 2, 'Coaching Session', 'Initial coaching consultation', 'training_session', 'scheduled', '2025-09-10 10:00:00', '2025-09-10 11:00:00', 'Local Football Ground', 1),
      (1, 1, 2, 'Player Interview', 'Interview for potential signing', 'interview', 'scheduled', '2025-09-09 14:00:00', '2025-09-09 15:00:00', 'Club Office', 1)`
    );
    
    console.log('Sample data created successfully');
    
    await dbConnection.end();
    console.log('Database setup completed successfully!');
    
  } catch (error) {
    console.error('Database setup error:', error.message);
    process.exit(1);
  }
}

createDatabase();
