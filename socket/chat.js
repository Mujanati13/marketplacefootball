const { query } = require('../config/database');

const chatSocket = (io, socket) => {
  
  // Join conversation room
  socket.on('join_conversation', async (data) => {
    try {
      const { conversation_id } = data;
      
      // Check if user is participant in this conversation
      const participants = await query(
        'SELECT user_id FROM conversation_participants WHERE conversation_id = ? AND user_id = ?',
        [conversation_id, socket.userId]
      );

      if (participants.length > 0 || socket.userRole === 'admin') {
        socket.join(`conversation_${conversation_id}`);
        socket.emit('joined_conversation', { conversation_id });
        
        // Notify other participants that user is online
        socket.to(`conversation_${conversation_id}`).emit('user_joined_conversation', {
          user_id: socket.userId,
          conversation_id
        });
      } else {
        socket.emit('error', { message: 'You do not have access to this conversation' });
      }
    } catch (error) {
      console.error('Join conversation error:', error);
      socket.emit('error', { message: 'Failed to join conversation' });
    }
  });

  // Leave conversation room
  socket.on('leave_conversation', (data) => {
    const { conversation_id } = data;
    socket.leave(`conversation_${conversation_id}`);
    
    // Notify other participants that user left
    socket.to(`conversation_${conversation_id}`).emit('user_left_conversation', {
      user_id: socket.userId,
      conversation_id
    });
    
    socket.emit('left_conversation', { conversation_id });
  });

  // Send message (alternative to REST API)
  socket.on('send_message', async (data) => {
    try {
      const { conversation_id, body, attachments } = data;

      // Validate input
      if (!conversation_id || !body || body.trim().length === 0) {
        socket.emit('error', { message: 'Conversation ID and message body are required' });
        return;
      }

      if (body.length > 2000) {
        socket.emit('error', { message: 'Message too long' });
        return;
      }

      // Check if user is participant
      const participants = await query(
        'SELECT user_id FROM conversation_participants WHERE conversation_id = ?',
        [conversation_id]
      );

      const isParticipant = participants.some(p => p.user_id === socket.userId);
      const isAdmin = socket.userRole === 'admin';

      if (!isParticipant && !isAdmin) {
        socket.emit('error', { message: 'You do not have access to this conversation' });
        return;
      }

      // Insert message
      const result = await query(
        'INSERT INTO messages (conversation_id, sender_user_id, body, attachments) VALUES (?, ?, ?, ?)',
        [conversation_id, socket.userId, body.trim(), JSON.stringify(attachments || [])]
      );

      // Get message with sender details
      const messages = await query(
        `SELECT m.*, u.name as sender_name, u.avatar_url as sender_avatar
         FROM messages m
         JOIN users u ON m.sender_user_id = u.id
         WHERE m.id = ?`,
        [result.insertId]
      );

      const message = messages[0];

      // Emit to conversation room
      io.to(`conversation_${conversation_id}`).emit('new_message', {
        conversation_id,
        message
      });

      // Send individual notifications to participants not in the conversation room
      const otherParticipants = participants.filter(p => p.user_id !== socket.userId);
      for (const participant of otherParticipants) {
        // Check if user is in the conversation room
        const userRooms = Array.from(io.sockets.adapter.rooms.get(`user_${participant.user_id}`) || []);
        const isInConversationRoom = userRooms.some(socketId => {
          const participantSocket = io.sockets.sockets.get(socketId);
          return participantSocket && participantSocket.rooms.has(`conversation_${conversation_id}`);
        });

        if (!isInConversationRoom) {
          io.to(`user_${participant.user_id}`).emit('new_message_notification', {
            conversation_id,
            message,
            unread_count: await getUnreadCount(participant.user_id)
          });
        }
      }

    } catch (error) {
      console.error('Send message error:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Mark messages as read
  socket.on('mark_read', async (data) => {
    try {
      const { conversation_id } = data;

      // Update read status
      await query(
        `UPDATE messages 
         SET read_at = CURRENT_TIMESTAMP 
         WHERE conversation_id = ? AND sender_user_id != ? AND read_at IS NULL`,
        [conversation_id, socket.userId]
      );

      // Notify sender that messages were read
      socket.to(`conversation_${conversation_id}`).emit('messages_read', {
        conversation_id,
        read_by: socket.userId
      });

      socket.emit('marked_read', { conversation_id });

    } catch (error) {
      console.error('Mark read error:', error);
      socket.emit('error', { message: 'Failed to mark messages as read' });
    }
  });

  // Typing indicator
  socket.on('typing_start', (data) => {
    const { conversation_id } = data;
    socket.to(`conversation_${conversation_id}`).emit('user_typing', {
      user_id: socket.userId,
      conversation_id,
      typing: true
    });
  });

  socket.on('typing_stop', (data) => {
    const { conversation_id } = data;
    socket.to(`conversation_${conversation_id}`).emit('user_typing', {
      user_id: socket.userId,
      conversation_id,
      typing: false
    });
  });

  // Get online users in conversation
  socket.on('get_online_users', async (data) => {
    try {
      const { conversation_id } = data;
      
      // Get all participants
      const participants = await query(
        `SELECT cp.user_id, u.name, u.avatar_url
         FROM conversation_participants cp
         JOIN users u ON cp.user_id = u.id
         WHERE cp.conversation_id = ?`,
        [conversation_id]
      );

      // Check which participants are online
      const onlineUsers = [];
      for (const participant of participants) {
        const userRoom = io.sockets.adapter.rooms.get(`user_${participant.user_id}`);
        if (userRoom && userRoom.size > 0) {
          onlineUsers.push({
            user_id: participant.user_id,
            name: participant.name,
            avatar_url: participant.avatar_url
          });
        }
      }

      socket.emit('online_users', {
        conversation_id,
        online_users: onlineUsers
      });

    } catch (error) {
      console.error('Get online users error:', error);
      socket.emit('error', { message: 'Failed to get online users' });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User ${socket.userId} disconnected`);
    
    // Notify all conversation rooms that user is offline
    Array.from(socket.rooms).forEach(room => {
      if (room.startsWith('conversation_')) {
        socket.to(room).emit('user_left_conversation', {
          user_id: socket.userId,
          conversation_id: room.replace('conversation_', '')
        });
      }
    });
  });
};

// Helper function to get unread message count
const getUnreadCount = async (userId) => {
  try {
    const result = await query(
      `SELECT COUNT(*) as unread_count
       FROM messages m
       JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
       WHERE cp.user_id = ? AND m.sender_user_id != ? AND m.read_at IS NULL`,
      [userId, userId]
    );
    return result[0].unread_count;
  } catch (error) {
    console.error('Get unread count error:', error);
    return 0;
  }
};

module.exports = chatSocket;
