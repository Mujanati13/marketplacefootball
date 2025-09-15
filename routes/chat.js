const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { verifyToken, requireRole } = require('../middleware/auth');
const { validateMessage, validateId, validatePagination } = require('../middleware/validation');
const { autoAuditLog, AUDIT_ACTIONS } = require('../middleware/audit');

// Get my conversations
router.get('/conversations',
  verifyToken,
  validatePagination,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;

      const conversations = await query(
        `SELECT DISTINCT c.*, 
                COUNT(m.id) as message_count,
                MAX(m.created_at) as last_message_at,
                (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
                r.type as request_type, r.status as request_status
         FROM conversations c
         JOIN conversation_participants cp ON c.id = cp.conversation_id
         LEFT JOIN messages m ON c.id = m.conversation_id
         LEFT JOIN requests r ON c.request_id = r.id
         WHERE cp.user_id = ?
         GROUP BY c.id
         ORDER BY IFNULL(last_message_at, c.created_at) DESC, c.created_at DESC
         LIMIT ? OFFSET ?`,
        [userId, limit, offset]
      );

      // Get participants for each conversation
      for (const conversation of conversations) {
        const participants = await query(
          `SELECT cp.*, u.name, u.email, u.avatar_url
           FROM conversation_participants cp
           JOIN users u ON cp.user_id = u.id
           WHERE cp.conversation_id = ? AND cp.user_id != ?`,
          [conversation.id, userId]
        );
        conversation.participants = participants;
      }

      res.json({ conversations });

    } catch (error) {
      console.error('Get conversations error:', error);
      res.status(500).json({ error: 'Failed to get conversations' });
    }
  }
);

// Get conversation by ID
router.get('/conversations/:id',
  verifyToken,
  validateId,
  async (req, res) => {
    try {
      const conversationId = req.params.id;
      const userId = req.user.id;

      // Check if user is participant or admin
      const participants = await query(
        'SELECT user_id FROM conversation_participants WHERE conversation_id = ?',
        [conversationId]
      );

      const isParticipant = participants.some(p => p.user_id === userId);
      const isAdmin = req.user.role === 'admin';

      if (!isParticipant && !isAdmin) {
        return res.status(403).json({ error: 'You do not have access to this conversation' });
      }

      // Get conversation details
      const conversations = await query(
        `SELECT c.*, 
                r.type as request_type, r.status as request_status
         FROM conversations c
         LEFT JOIN requests r ON c.request_id = r.id
         WHERE c.id = ?`,
        [conversationId]
      );

      if (conversations.length === 0) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      const conversation = conversations[0];

      // Get all participants
      const allParticipants = await query(
        `SELECT cp.*, u.name, u.email, u.avatar_url, u.role
         FROM conversation_participants cp
         JOIN users u ON cp.user_id = u.id
         WHERE cp.conversation_id = ?`,
        [conversationId]
      );

      conversation.participants = allParticipants;

      res.json(conversation);

    } catch (error) {
      console.error('Get conversation error:', error);
      res.status(500).json({ error: 'Failed to get conversation' });
    }
  }
);

// Get messages in conversation
router.get('/conversations/:id/messages',
  verifyToken,
  validateId,
  validatePagination,
  async (req, res) => {
    try {
      const conversationId = req.params.id;
      const userId = req.user.id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const offset = (page - 1) * limit;

      // Check if user is participant or admin
      const participants = await query(
        'SELECT user_id FROM conversation_participants WHERE conversation_id = ?',
        [conversationId]
      );

      const isParticipant = participants.some(p => p.user_id === userId);
      const isAdmin = req.user.role === 'admin';

      if (!isParticipant && !isAdmin) {
        return res.status(403).json({ error: 'You do not have access to this conversation' });
      }

      // Get messages
      const messages = await query(
        `SELECT m.*, 
         u.first_name as sender_first_name, 
         u.last_name as sender_last_name, 
         u.avatar_url as sender_avatar
         FROM messages m
         JOIN users u ON m.sender_id = u.id
         WHERE m.conversation_id = ?
         ORDER BY m.created_at DESC
         LIMIT ? OFFSET ?`,
        [conversationId, limit, offset]
      );

      // Mark messages as read for this user (simplified since is_read column exists)
      await query(
        `UPDATE messages 
         SET is_read = true 
         WHERE conversation_id = ? AND sender_id != ? AND is_read = false`,
        [conversationId, userId]
      );

      res.json({ 
        messages: messages.reverse(), // Return in chronological order
        has_more: messages.length === limit
      });

    } catch (error) {
      console.error('Get messages error:', error);
      res.status(500).json({ error: 'Failed to get messages' });
    }
  }
);

// Send message
router.post('/conversations/:id/messages',
  verifyToken,
  validateId,
  validateMessage,
  autoAuditLog(AUDIT_ACTIONS.SEND_MESSAGE, 'message'),
  async (req, res) => {
    try {
      const conversationId = req.params.id;
      const userId = req.user.id;
      const { body, attachments } = req.body;

      // Check if user is participant or admin
      const participants = await query(
        'SELECT user_id FROM conversation_participants WHERE conversation_id = ?',
        [conversationId]
      );

      const isParticipant = participants.some(p => p.user_id === userId);
      const isAdmin = req.user.role === 'admin';

      if (!isParticipant && !isAdmin) {
        return res.status(403).json({ error: 'You do not have access to this conversation' });
      }

      // Send message
      const result = await query(
        `INSERT INTO messages (conversation_id, sender_id, content)
         VALUES (?, ?, ?)`,
        [conversationId, userId, body]
      );

      // Get created message with sender details
      const messages = await query(
        `SELECT m.*, 
         u.first_name as sender_first_name, 
         u.last_name as sender_last_name, 
         u.avatar_url as sender_avatar
         FROM messages m
         JOIN users u ON m.sender_id = u.id
         WHERE m.id = ?`,
        [result.insertId]
      );

      const message = messages[0];

      // Emit real-time message to other participants
      const io = req.app.get('io');
      if (io) {
        const otherParticipants = participants.filter(p => p.user_id !== userId);
        otherParticipants.forEach(participant => {
          io.to(`user_${participant.user_id}`).emit('new_message', {
            conversation_id: conversationId,
            message
          });
        });
      }

      res.status(201).json(message);

    } catch (error) {
      console.error('Send message error:', error);
      res.status(500).json({ error: 'Failed to send message' });
    }
  }
);

// Create conversation (support requires admin, general/deal open to all users)
router.post('/conversations',
  verifyToken,
  autoAuditLog(AUDIT_ACTIONS.CREATE_CONVERSATION, 'conversation'),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;
      const { type, user_ids, request_id, title } = req.body;

      if (!['deal', 'general', 'support'].includes(type)) {
        return res.status(400).json({ error: 'Type must be deal, general, or support' });
      }

      // Only admins can create support conversations
      if (type === 'support' && userRole !== 'admin') {
        return res.status(403).json({ error: 'Only admins can create support conversations' });
      }

      if (!Array.isArray(user_ids) || user_ids.length === 0) {
        return res.status(400).json({ error: 'User IDs array is required' });
      }

      // Verify users exist
      const users = await query(
        `SELECT id FROM users WHERE id IN (${user_ids.map(() => '?').join(',')}) AND is_active = true`,
        user_ids
      );

      if (users.length !== user_ids.length) {
        return res.status(404).json({ error: 'One or more users not found' });
      }

      // For support conversations, create with admin and one user
      // For other types, create with current user and first participant
      const user1_id = userId;
      const user2_id = user_ids[0]; // For simplicity, use first user

      // Create conversation
      const result = await query(
        `INSERT INTO conversations (title, type, request_id, user1_id, user2_id, created_by_user_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [title, type, request_id, user1_id, user2_id, userId]
      );

      const conversationId = result.insertId;

      // Add participants based on conversation type
      let participantInserts;
      
      if (type === 'support') {
        // Support conversations: admin as admin, user as member
        participantInserts = [
          [conversationId, userId, 'admin'],
          [conversationId, user2_id, 'member']
        ];
      } else {
        // General/deal conversations: creator as member, other users as members
        participantInserts = [
          [conversationId, userId, 'member'],
          [conversationId, user2_id, 'member']
        ];
      }

      for (const [convId, userId, role] of participantInserts) {
        await query(
          `INSERT INTO conversation_participants (conversation_id, user_id, role_in_conversation)
           VALUES (?, ?, ?)`,
          [convId, userId, role]
        );
      }

      // Get created conversation
      const conversations = await query(
        'SELECT * FROM conversations WHERE id = ?',
        [conversationId]
      );

      res.status(201).json(conversations[0]);

    } catch (error) {
      console.error('Create conversation error:', error);
      res.status(500).json({ error: 'Failed to create conversation' });
    }
  }
);

// Join conversation (admin only)
router.post('/conversations/:id/join',
  verifyToken,
  validateId,
  requireRole(['admin']),
  autoAuditLog(AUDIT_ACTIONS.JOIN_CONVERSATION, 'conversation'),
  async (req, res) => {
    try {
      const conversationId = req.params.id;
      const adminId = req.user.id;

      // Check if conversation exists
      const conversations = await query(
        'SELECT id FROM conversations WHERE id = ?',
        [conversationId]
      );

      if (conversations.length === 0) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      // Check if admin is already a participant
      const existing = await query(
        'SELECT user_id FROM conversation_participants WHERE conversation_id = ? AND user_id = ?',
        [conversationId, adminId]
      );

      if (existing.length > 0) {
        return res.status(409).json({ error: 'Already a participant in this conversation' });
      }

      // Add admin as participant
      await query(
        `INSERT INTO conversation_participants (conversation_id, user_id, role_in_conversation)
         VALUES (?, ?, 'admin')`,
        [conversationId, adminId]
      );

      // Notify other participants
      const io = req.app.get('io');
      if (io) {
        const participants = await query(
          'SELECT user_id FROM conversation_participants WHERE conversation_id = ? AND user_id != ?',
          [conversationId, adminId]
        );

        participants.forEach(participant => {
          io.to(`user_${participant.user_id}`).emit('admin_joined_conversation', {
            conversation_id: conversationId,
            admin_id: adminId
          });
        });
      }

      res.json({ message: 'Joined conversation successfully' });

    } catch (error) {
      console.error('Join conversation error:', error);
      res.status(500).json({ error: 'Failed to join conversation' });
    }
  }
);

// Get unread message count
router.get('/unread-count',
  verifyToken,
  async (req, res) => {
    try {
      const userId = req.user.id;

      const result = await query(
        `SELECT COUNT(*) as unread_count
         FROM messages m
         JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
         WHERE cp.user_id = ? AND m.sender_user_id != ? AND m.read_at IS NULL`,
        [userId, userId]
      );

      res.json({ unread_count: result[0].unread_count });

    } catch (error) {
      console.error('Get unread count error:', error);
      res.status(500).json({ error: 'Failed to get unread count' });
    }
  }
);

module.exports = router;
