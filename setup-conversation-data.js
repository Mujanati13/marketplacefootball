const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'simo1234',
  database: process.env.DB_NAME || 'football_marketplace'
};

async function populateConversationData() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database');

    // Check if we have any conversations
    const [conversations] = await connection.execute('SELECT * FROM conversations');
    console.log(`Found ${conversations.length} existing conversations`);

    // If no conversations exist, create some test data
    if (conversations.length === 0) {
      console.log('Creating test conversation...');
      
      // Create a test conversation between admin (id=1) and first user (id=2)
      const [result] = await connection.execute(`
        INSERT INTO conversations (type, user1_id, user2_id, created_by_user_id, last_message_at)
        VALUES ('general', 1, 2, 1, NOW())
      `);
      
      const conversationId = result.insertId;
      console.log(`Created conversation with ID: ${conversationId}`);

      // Add participants
      await connection.execute(`
        INSERT INTO conversation_participants (conversation_id, user_id, role_in_conversation)
        VALUES (?, 1, 'member'), (?, 2, 'member')
      `, [conversationId, conversationId]);
      
      console.log('Added conversation participants');

      // Add a test message
      await connection.execute(`
        INSERT INTO messages (conversation_id, sender_id, content, message_type, created_at)
        VALUES (?, 1, 'Welcome to the Football Marketplace! This is a test conversation.', 'text', NOW())
      `, [conversationId]);
      
      console.log('Added test message');
    } else {
      // Check if participants exist for existing conversations
      for (const conversation of conversations) {
        const [participants] = await connection.execute(
          'SELECT * FROM conversation_participants WHERE conversation_id = ?',
          [conversation.id]
        );
        
        if (participants.length === 0) {
          console.log(`Adding participants for conversation ${conversation.id}`);
          await connection.execute(`
            INSERT INTO conversation_participants (conversation_id, user_id, role_in_conversation)
            VALUES (?, ?, 'member'), (?, ?, 'member')
          `, [
            conversation.id, conversation.user1_id,
            conversation.id, conversation.user2_id
          ]);
        }
      }
    }

    console.log('✅ Conversation data setup completed successfully');
    
  } catch (error) {
    console.error('❌ Error setting up conversation data:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

if (require.main === module) {
  populateConversationData().catch(console.error);
}

module.exports = { populateConversationData };
