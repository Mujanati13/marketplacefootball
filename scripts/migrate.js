const { query, testConnection } = require('../config/database');
require('dotenv').config();

const createTables = async () => {
  try {
    // Test connection first
    const connected = await testConnection();
    if (!connected) {
      console.error('Cannot connect to database. Please check your configuration.');
      process.exit(1);
    }

    console.log('Creating database tables...');

    // Users table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20),
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        avatar_url TEXT,
        role ENUM('customer', 'player', 'coach', 'admin') NOT NULL DEFAULT 'customer',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_role (role),
        INDEX idx_active (is_active)
      )
    `);

    // Profiles table
    await query(`
      CREATE TABLE IF NOT EXISTS profiles (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        user_id BIGINT NOT NULL,
        type ENUM('player', 'coach') NOT NULL,
        bio TEXT,
        location VARCHAR(255),
        years_experience INT DEFAULT 0,
        hourly_rate DECIMAL(10,2),
        currency VARCHAR(3) DEFAULT 'USD',
        positions JSON,
        skills JSON,
        tags JSON,
        media JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_type (type),
        INDEX idx_location (location)
      )
    `);

    // Listings table
    await query(`
      CREATE TABLE IF NOT EXISTS listings (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        owner_user_id BIGINT NOT NULL,
        type ENUM('player', 'coach') NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        status ENUM('active', 'paused') DEFAULT 'active',
        media JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_owner (owner_user_id),
        INDEX idx_type_status (type, status),
        INDEX idx_price (price),
        INDEX idx_created (created_at)
      )
    `);

    // Requests table
    await query(`
      CREATE TABLE IF NOT EXISTS requests (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        requester_user_id BIGINT NOT NULL,
        target_user_id BIGINT NOT NULL,
        listing_id BIGINT NOT NULL,
        type ENUM('buy', 'hire') NOT NULL,
        message TEXT,
        status ENUM('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'pending',
        admin_assigned_id BIGINT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (requester_user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
        FOREIGN KEY (admin_assigned_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_status (status),
        INDEX idx_admin_assigned (admin_assigned_id),
        INDEX idx_requester_created (requester_user_id, created_at),
        INDEX idx_target (target_user_id),
        INDEX idx_listing (listing_id)
      )
    `);

    // Meetings table
    await query(`
      CREATE TABLE IF NOT EXISTS meetings (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        request_id BIGINT NOT NULL,
        scheduled_by_admin_id BIGINT NOT NULL,
        coach_user_id BIGINT NOT NULL,
        player_user_id BIGINT NOT NULL,
        start_at DATETIME NOT NULL,
        end_at DATETIME NOT NULL,
        location_uri TEXT,
        status ENUM('scheduled', 'rescheduled', 'cancelled', 'completed') DEFAULT 'scheduled',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE,
        FOREIGN KEY (scheduled_by_admin_id) REFERENCES users(id) ON DELETE RESTRICT,
        FOREIGN KEY (coach_user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (player_user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_coach_start (coach_user_id, start_at),
        INDEX idx_player_start (player_user_id, start_at),
        INDEX idx_request (request_id),
        INDEX idx_status (status)
      )
    `);

    // Conversations table
    await query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        type ENUM('deal', 'support') NOT NULL,
        request_id BIGINT,
        meeting_id BIGINT,
        created_by_user_id BIGINT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE,
        FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_request (request_id),
        INDEX idx_meeting (meeting_id),
        INDEX idx_created_by (created_by_user_id)
      )
    `);

    // Conversation participants table
    await query(`
      CREATE TABLE IF NOT EXISTS conversation_participants (
        conversation_id BIGINT NOT NULL,
        user_id BIGINT NOT NULL,
        role_in_conversation ENUM('user', 'coach', 'admin') NOT NULL,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (conversation_id, user_id),
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user (user_id)
      )
    `);

    // Messages table
    await query(`
      CREATE TABLE IF NOT EXISTS messages (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        conversation_id BIGINT NOT NULL,
        sender_user_id BIGINT NOT NULL,
        body TEXT NOT NULL,
        attachments JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        read_at TIMESTAMP NULL,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
        FOREIGN KEY (sender_user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_conversation_created (conversation_id, created_at),
        INDEX idx_sender (sender_user_id),
        INDEX idx_read (read_at)
      )
    `);

    // Audit logs table
    await query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        actor_user_id BIGINT,
        action VARCHAR(255) NOT NULL,
        entity VARCHAR(100) NOT NULL,
        entity_id BIGINT,
        payload JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_actor (actor_user_id),
        INDEX idx_entity (entity, entity_id),
        INDEX idx_action (action),
        INDEX idx_created (created_at)
      )
    `);

    console.log('All tables created successfully!');
    
  } catch (error) {
    console.error('Error creating tables:', error);
    process.exit(1);
  }
};

// Run migration if called directly
if (require.main === module) {
  createTables().then(() => {
    console.log('Migration completed successfully!');
    process.exit(0);
  });
}

module.exports = createTables;
