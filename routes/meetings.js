const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { verifyToken, requireRole } = require('../middleware/auth');
const { validateMeeting, validateId, validatePagination } = require('../middleware/validation');
const { autoAuditLog, AUDIT_ACTIONS } = require('../middleware/audit');

// Create meeting (admin only)
router.post('/',
  verifyToken,
  requireRole(['admin']),
  validateMeeting,
  autoAuditLog(AUDIT_ACTIONS.CREATE_MEETING, 'meeting'),
  async (req, res) => {
    try {
      console.log('DEBUG - Create Meeting - Request body:', req.body);
      
      const adminId = req.user.id;
      const {
        request_id,
        coach_user_id,
        player_user_id,
        start_at,
        end_at,
        location_uri,
        notes
      } = req.body;

      console.log('DEBUG - Admin ID:', adminId);
      console.log('DEBUG - Request ID:', request_id);
      console.log('DEBUG - Coach ID:', coach_user_id);
      console.log('DEBUG - Player ID:', player_user_id);

      // Validate datetime
      const startDate = new Date(start_at);
      const endDate = new Date(end_at);

      if (startDate >= endDate) {
        return res.status(400).json({ error: 'Start time must be before end time' });
      }

      if (startDate < new Date()) {
        return res.status(400).json({ error: 'Meeting cannot be scheduled in the past' });
      }

      // Convert dates to MySQL format (YYYY-MM-DD HH:MM:SS)
      const mysqlStartAt = startDate.toISOString().slice(0, 19).replace('T', ' ');
      const mysqlEndAt = endDate.toISOString().slice(0, 19).replace('T', ' ');

      // Check if request exists and is approved
      const requests = await query(
        'SELECT id, status FROM requests WHERE id = ?',
        [request_id]
      );

      if (requests.length === 0) {
        return res.status(404).json({ error: 'Request not found' });
      }

      if (requests[0].status !== 'accepted') {
        return res.status(400).json({ error: 'Only accepted requests can have meetings scheduled' });
      }

      // Check if users exist and have correct roles
      const coachUsers = await query(
        'SELECT id, role FROM users WHERE id = ? AND role IN ("coach", "admin") AND is_active = true',
        [coach_user_id]
      );

      const playerUsers = await query(
        'SELECT id, role FROM users WHERE id = ? AND role IN ("player", "customer") AND is_active = true',
        [player_user_id]
      );

      if (coachUsers.length === 0) {
        return res.status(404).json({ error: 'Coach not found or invalid role' });
      }

      if (playerUsers.length === 0) {
        return res.status(404).json({ error: 'Player not found or invalid role' });
      }

      // Check for conflicts (same user, overlapping times)
      const conflicts = await query(
        `SELECT id FROM meetings 
         WHERE status IN ('scheduled', 'confirmed') 
         AND ((coach_user_id = ? OR player_user_id = ?) OR (coach_user_id = ? OR player_user_id = ?))
         AND ((start_at < ? AND end_at > ?) OR (start_at < ? AND end_at > ?))`,
        [coach_user_id, coach_user_id, player_user_id, player_user_id, 
         mysqlEndAt, mysqlStartAt, mysqlEndAt, mysqlStartAt]
      );

      if (conflicts.length > 0) {
        return res.status(409).json({ error: 'Scheduling conflict detected' });
      }

      console.log('DEBUG - About to insert meeting with dates:', mysqlStartAt, mysqlEndAt);

      // Create meeting
      const result = await query(
        `INSERT INTO meetings 
         (request_id, created_by, coach_user_id, player_user_id, 
          start_at, end_at, location_uri, notes, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'scheduled')`,
        [request_id, adminId, coach_user_id, player_user_id, mysqlStartAt, mysqlEndAt, location_uri, notes]
      );

      // Get created meeting with details
      const meetings = await query(
        `SELECT m.*, 
                c.name as coach_name, c.email as coach_email,
                p.name as player_name, p.email as player_email,
                admin.name as admin_name,
                r.type as request_type
         FROM meetings m
         JOIN users c ON m.coach_user_id = c.id
         JOIN users p ON m.player_user_id = p.id
         JOIN users admin ON m.created_by = admin.id
         JOIN requests r ON m.request_id = r.id
         WHERE m.id = ?`,
        [result.insertId]
      );

      // Emit real-time notifications
      const io = req.app.get('io');
      if (io) {
        const meeting = meetings[0];
        io.to(`user_${coach_user_id}`).emit('meeting_scheduled', { meeting });
        io.to(`user_${player_user_id}`).emit('meeting_scheduled', { meeting });
      }

      res.status(201).json(meetings[0]);

    } catch (error) {
      console.error('Create meeting error:', error);
      console.error('Error stack:', error.stack);
      res.status(500).json({ error: 'Failed to create meeting' });
    }
  }
);

// Get all meetings (admin only)
router.get('/',
  verifyToken,
  requireRole(['admin']),
  validatePagination,
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;
      const { status, coach_id, player_id } = req.query;

      let sql = `
        SELECT m.*, 
               c.name as coach_name, c.email as coach_email,
               p.name as player_name, p.email as player_email,
               admin.name as admin_name
        FROM meetings m
        JOIN users c ON m.coach_user_id = c.id
        JOIN users p ON m.player_user_id = p.id
        JOIN users admin ON m.created_by = admin.id
        WHERE 1=1
      `;
      const params = [];

      if (status) {
        sql += ' AND m.status = ?';
        params.push(status);
      }

      if (coach_id) {
        sql += ' AND m.coach_user_id = ?';
        params.push(coach_id);
      }

      if (player_id) {
        sql += ' AND m.player_user_id = ?';
        params.push(player_id);
      }

      sql += ' ORDER BY m.start_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const meetings = await query(sql, params);

      // Get total count for pagination
      let countSql = `
        SELECT COUNT(*) as total_count
        FROM meetings m
        JOIN users c ON m.coach_user_id = c.id
        JOIN users p ON m.player_user_id = p.id
        JOIN users admin ON m.created_by = admin.id
        WHERE 1=1
      `;
      const countParams = [];

      if (status) {
        countSql += ' AND m.status = ?';
        countParams.push(status);
      }

      if (coach_id) {
        countSql += ' AND m.coach_user_id = ?';
        countParams.push(coach_id);
      }

      if (player_id) {
        countSql += ' AND m.player_user_id = ?';
        countParams.push(player_id);
      }

      const countResult = await query(countSql, countParams);
      const total = countResult[0].total_count;

      res.json({ 
        meetings,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Get meetings error:', error);
      res.status(500).json({ error: 'Failed to get meetings' });
    }
  }
);

// Get my meetings
router.get('/my/meetings',
  verifyToken,
  validatePagination,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;
      const { status, upcoming } = req.query;

      let sql = `
        SELECT m.*, 
               c.name as coach_name, c.email as coach_email,
               p.name as player_name, p.email as player_email,
               CASE 
                 WHEN m.coach_user_id = ? THEN 'coach'
                 WHEN m.player_user_id = ? THEN 'participant'
               END as my_role
        FROM meetings m
        JOIN users c ON m.coach_user_id = c.id
        JOIN users p ON m.player_user_id = p.id
        WHERE (m.coach_user_id = ? OR m.player_user_id = ?)
      `;
      const params = [userId, userId, userId, userId];

      if (status) {
        sql += ' AND m.status = ?';
        params.push(status);
      }

      if (upcoming === 'true') {
        sql += ' AND m.start_at > NOW()';
      }

      sql += ' ORDER BY m.start_at ASC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const meetings = await query(sql, params);

      // Get total count for pagination
      let countSql = `
        SELECT COUNT(*) as total_count
        FROM meetings m
        JOIN users c ON m.coach_user_id = c.id
        JOIN users p ON m.player_user_id = p.id
        WHERE (m.coach_user_id = ? OR m.player_user_id = ?)
      `;
      const countParams = [userId, userId];

      if (status) {
        countSql += ' AND m.status = ?';
        countParams.push(status);
      }

      if (upcoming === 'true') {
        countSql += ' AND m.start_at > NOW()';
      }

      const countResult = await query(countSql, countParams);
      const total = countResult[0].total_count;

      res.json({ 
        meetings,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Get my meetings error:', error);
      res.status(500).json({ error: 'Failed to get your meetings' });
    }
  }
);

// Get meeting by ID
router.get('/:id',
  verifyToken,
  validateId,
  async (req, res) => {
    try {
      const meetingId = req.params.id;
      const userId = req.user.id;

      const meetings = await query(
        `SELECT m.*, 
                c.name as coach_name, c.email as coach_email,
                p.name as player_name, p.email as player_email,
                admin.name as admin_name,
                r.type as request_type, r.message as request_message
         FROM meetings m
         JOIN users c ON m.coach_user_id = c.id
         JOIN users p ON m.player_user_id = p.id
         JOIN users admin ON m.created_by = admin.id
         JOIN requests r ON m.request_id = r.id
         WHERE m.id = ?`,
        [meetingId]
      );

      if (meetings.length === 0) {
        return res.status(404).json({ error: 'Meeting not found' });
      }

      const meeting = meetings[0];

      // Check if user has permission to view this meeting
      if (req.user.role !== 'admin' && 
          meeting.coach_user_id !== userId && 
          meeting.player_user_id !== userId) {
        return res.status(403).json({ error: 'You do not have permission to view this meeting' });
      }

      res.json(meeting);

    } catch (error) {
      console.error('Get meeting error:', error);
      res.status(500).json({ error: 'Failed to get meeting' });
    }
  }
);

// Update meeting (admin only)
router.put('/:id',
  verifyToken,
  validateId,
  requireRole(['admin']),
  autoAuditLog(AUDIT_ACTIONS.UPDATE_MEETING, 'meeting'),
  async (req, res) => {
    try {
      const meetingId = req.params.id;
      const { start_at, end_at, location_uri, notes, status } = req.body;

      // Check if meeting exists
      const existingMeetings = await query(
        'SELECT id, status, coach_user_id, player_user_id FROM meetings WHERE id = ?',
        [meetingId]
      );

      if (existingMeetings.length === 0) {
        return res.status(404).json({ error: 'Meeting not found' });
      }

      const meeting = existingMeetings[0];

      // Validate datetime if provided
      if (start_at || end_at) {
        const startDate = new Date(start_at || meeting.start_at);
        const endDate = new Date(end_at || meeting.end_at);

        if (startDate >= endDate) {
          return res.status(400).json({ error: 'Start time must be before end time' });
        }

        if (startDate < new Date() && !status) {
          return res.status(400).json({ error: 'Meeting cannot be rescheduled to the past' });
        }
      }

      // Check for conflicts if rescheduling
      if (start_at || end_at) {
        const conflicts = await query(
          `SELECT id FROM meetings 
           WHERE id != ? AND status IN ('scheduled', 'inProgress') 
           AND ((coach_user_id = ? OR player_user_id = ?) OR (coach_user_id = ? OR player_user_id = ?))
           AND ((start_at < ? AND end_at > ?) OR (start_at < ? AND end_at > ?))`,
          [meetingId, meeting.coach_user_id, meeting.coach_user_id, meeting.player_user_id, meeting.player_user_id,
           end_at || meeting.end_at, start_at || meeting.start_at, 
           end_at || meeting.end_at, start_at || meeting.start_at]
        );

        if (conflicts.length > 0) {
          return res.status(409).json({ error: 'Scheduling conflict detected' });
        }
      }

      // Build update query
      const updates = [];
      const params = [];

      if (start_at !== undefined) {
        updates.push('start_at = ?');
        params.push(start_at);
      }
      if (end_at !== undefined) {
        updates.push('end_at = ?');
        params.push(end_at);
      }
      if (location_uri !== undefined) {
        updates.push('location_uri = ?');
        params.push(location_uri);
      }
      if (notes !== undefined) {
        updates.push('notes = ?');
        params.push(notes);
      }
      if (status !== undefined) {
        if (!['scheduled', 'inProgress', 'completed', 'cancelled'].includes(status)) {
          return res.status(400).json({ error: 'Invalid status' });
        }
        updates.push('status = ?');
        params.push(status);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      // If datetime changed, mark as rescheduled
      if ((start_at || end_at) && !status) {
        updates.push('status = ?');
        params.push('rescheduled');
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      params.push(meetingId);

      await query(
        `UPDATE meetings SET ${updates.join(', ')} WHERE id = ?`,
        params
      );

      // Get updated meeting
      const updatedMeetings = await query(
        `SELECT m.*, 
                c.name as coach_name,
                p.name as player_name
         FROM meetings m
         JOIN users c ON m.coach_user_id = c.id
         JOIN users p ON m.player_user_id = p.id
         WHERE m.id = ?`,
        [meetingId]
      );

      // Emit real-time notifications
      const io = req.app.get('io');
      if (io) {
        const updatedMeeting = updatedMeetings[0];
        io.to(`user_${meeting.coach_user_id}`).emit('meeting_updated', updatedMeeting);
        io.to(`user_${meeting.player_user_id}`).emit('meeting_updated', updatedMeeting);
      }

      res.json(updatedMeetings[0]);

    } catch (error) {
      console.error('Update meeting error:', error);
      res.status(500).json({ error: 'Failed to update meeting' });
    }
  }
);

// Cancel meeting (admin only)
router.patch('/:id/cancel',
  verifyToken,
  validateId,
  requireRole(['admin']),
  autoAuditLog(AUDIT_ACTIONS.CANCEL_MEETING, 'meeting'),
  async (req, res) => {
    try {
      const meetingId = req.params.id;

      // Check if meeting exists and can be cancelled
      const meetings = await query(
        'SELECT id, status, coach_user_id, player_user_id FROM meetings WHERE id = ?',
        [meetingId]
      );

      if (meetings.length === 0) {
        return res.status(404).json({ error: 'Meeting not found' });
      }

      const meeting = meetings[0];

      if (meeting.status === 'cancelled') {
        return res.status(400).json({ error: 'Meeting is already cancelled' });
      }

      if (meeting.status === 'completed') {
        return res.status(400).json({ error: 'Cannot cancel completed meetings' });
      }

      // Cancel meeting
      await query(
        'UPDATE meetings SET status = "cancelled", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [meetingId]
      );

      // Emit real-time notifications
      const io = req.app.get('io');
      if (io) {
        io.to(`user_${meeting.coach_user_id}`).emit('meeting_cancelled', { meeting_id: meetingId });
        io.to(`user_${meeting.player_user_id}`).emit('meeting_cancelled', { meeting_id: meetingId });
      }

      res.json({ message: 'Meeting cancelled successfully' });

    } catch (error) {
      console.error('Cancel meeting error:', error);
      res.status(500).json({ error: 'Failed to cancel meeting' });
    }
  }
);

// Complete meeting (admin only)
router.patch('/:id/complete',
  verifyToken,
  validateId,
  requireRole(['admin']),
  autoAuditLog(AUDIT_ACTIONS.COMPLETE_MEETING, 'meeting'),
  async (req, res) => {
    try {
      const meetingId = req.params.id;
      const { notes } = req.body;

      // Check if meeting exists and can be completed
      const meetings = await query(
        'SELECT id, status, coach_user_id, player_user_id FROM meetings WHERE id = ?',
        [meetingId]
      );

      if (meetings.length === 0) {
        return res.status(404).json({ error: 'Meeting not found' });
      }

      const meeting = meetings[0];

      if (meeting.status === 'completed') {
        return res.status(400).json({ error: 'Meeting is already completed' });
      }

      if (meeting.status === 'cancelled') {
        return res.status(400).json({ error: 'Cannot complete cancelled meetings' });
      }

      // Complete meeting
      const updates = ['status = "completed"', 'updated_at = CURRENT_TIMESTAMP'];
      const params = [];

      if (notes) {
        updates.push('notes = ?');
        params.push(notes);
      }

      params.push(meetingId);

      await query(
        `UPDATE meetings SET ${updates.join(', ')} WHERE id = ?`,
        params
      );

      // Emit real-time notifications
      const io = req.app.get('io');
      if (io) {
        io.to(`user_${meeting.coach_user_id}`).emit('meeting_completed', { meeting_id: meetingId });
        io.to(`user_${meeting.player_user_id}`).emit('meeting_completed', { meeting_id: meetingId });
      }

      res.json({ message: 'Meeting completed successfully' });

    } catch (error) {
      console.error('Complete meeting error:', error);
      res.status(500).json({ error: 'Failed to complete meeting' });
    }
  }
);

module.exports = router;
