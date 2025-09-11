const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { verifyToken, requireRole } = require('../middleware/auth');
const { autoAuditLog, AUDIT_ACTIONS } = require('../middleware/audit');

// Admin-specific routes for request moderation

// Get admin requests queue with filters
router.get('/requests', 
  verifyToken,
  requireRole(['admin']),
  async (req, res) => {
    try {
      const { status, assignedTo, page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      let whereConditions = [];
      let queryParams = [];

      if (status) {
        whereConditions.push('r.status = ?');
        queryParams.push(status);
      }

      if (assignedTo) {
        whereConditions.push('r.admin_assigned_id = ?');
        queryParams.push(assignedTo);
      }

      const whereClause = whereConditions.length > 0 
        ? 'WHERE ' + whereConditions.join(' AND ')
        : '';

      const requests = await query(`
        SELECT r.id, r.message, r.status, r.created_at, r.updated_at,
               r.admin_assigned_id,
               sender.id as sender_id, sender.email as sender_email,
               receiver.id as receiver_id, receiver.email as receiver_email,
               l.title as listing_title, l.type as listing_type,
               admin.email as admin_email
        FROM requests r
        LEFT JOIN users sender ON r.sender_id = sender.id
        LEFT JOIN users receiver ON r.receiver_id = receiver.id
        LEFT JOIN listings l ON r.listing_id = l.id
        LEFT JOIN users admin ON r.admin_assigned_id = admin.id
        ${whereClause}
        ORDER BY r.created_at DESC
        LIMIT ? OFFSET ?
      `, [...queryParams, parseInt(limit), offset]);

      // Get total count for pagination
      const countResult = await query(`
        SELECT COUNT(*) as total
        FROM requests r
        ${whereClause}
      `, queryParams);

      const total = countResult[0].total;
      const totalPages = Math.ceil(total / limit);

      res.json({
        requests,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });

    } catch (error) {
      console.error('Admin requests fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch requests' });
    }
  }
);

// Update request status (admin moderation)
router.patch('/requests/:id',
  verifyToken,
  requireRole(['admin']),
  autoAuditLog(AUDIT_ACTIONS.UPDATE, 'requests'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;
      const adminId = req.user.id;

      // Validate status
      const validStatuses = ['pending', 'approved', 'rejected', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      // Get current request
      const currentRequests = await query(
        'SELECT * FROM requests WHERE id = ?',
        [id]
      );

      if (currentRequests.length === 0) {
        return res.status(404).json({ error: 'Request not found' });
      }

      const currentRequest = currentRequests[0];

      // Update request with admin assignment on first action
      const updateResult = await query(
        `UPDATE requests 
         SET status = ?, 
             admin_assigned_id = COALESCE(admin_assigned_id, ?),
             notes = COALESCE(?, notes),
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [status, adminId, notes, id]
      );

      if (updateResult.affectedRows === 0) {
        return res.status(404).json({ error: 'Request not found' });
      }

      // Get updated request
      const updatedRequests = await query(`
        SELECT r.*, 
               sender.email as sender_email,
               receiver.email as receiver_email,
               l.title as listing_title,
               admin.email as admin_email
        FROM requests r
        LEFT JOIN users sender ON r.sender_id = sender.id
        LEFT JOIN users receiver ON r.receiver_id = receiver.id
        LEFT JOIN listings l ON r.listing_id = l.id
        LEFT JOIN users admin ON r.admin_assigned_id = admin.id
        WHERE r.id = ?
      `, [id]);

      const updatedRequest = updatedRequests[0];

      // Store audit log data
      req.auditData = {
        oldValues: currentRequest,
        newValues: updatedRequest,
        description: `Admin ${req.user.email} updated request status to ${status}`
      };

      res.json({
        message: 'Request updated successfully',
        request: updatedRequest
      });

    } catch (error) {
      console.error('Admin request update error:', error);
      res.status(500).json({ error: 'Failed to update request' });
    }
  }
);

// Create meeting from approved request
router.post('/meetings',
  verifyToken,
  requireRole(['admin']),
  autoAuditLog(AUDIT_ACTIONS.CREATE, 'meetings'),
  async (req, res) => {
    try {
      const { 
        requestId, 
        title, 
        description, 
        meetingType, 
        scheduledAt, 
        location, 
        durationMinutes = 60,
        notes 
      } = req.body;

      // Validate required fields
      if (!requestId || !title || !meetingType || !scheduledAt) {
        return res.status(400).json({ 
          error: 'Missing required fields: requestId, title, meetingType, scheduledAt' 
        });
      }

      // Check if request exists and is approved
      const requests = await query(
        'SELECT * FROM requests WHERE id = ? AND status = ?',
        [requestId, 'approved']
      );

      if (requests.length === 0) {
        return res.status(404).json({ 
          error: 'Request not found or not approved' 
        });
      }

      // Create meeting
      const result = await query(`
        INSERT INTO meetings (
          request_id, title, description, meeting_type, 
          scheduled_at, location, duration_minutes, notes, 
          created_by, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled')
      `, [
        requestId, title, description, meetingType,
        scheduledAt, location, durationMinutes, notes,
        req.user.id
      ]);

      const meetingId = result.insertId;

      // Get created meeting with related data
      const meetings = await query(`
        SELECT m.*, 
               r.sender_id, r.receiver_id,
               sender.email as sender_email,
               receiver.email as receiver_email,
               l.title as listing_title
        FROM meetings m
        JOIN requests r ON m.request_id = r.id
        LEFT JOIN users sender ON r.sender_id = sender.id
        LEFT JOIN users receiver ON r.receiver_id = receiver.id
        LEFT JOIN listings l ON r.listing_id = l.id
        WHERE m.id = ?
      `, [meetingId]);

      const meeting = meetings[0];

      // Store audit log data
      req.auditData = {
        oldValues: {},
        newValues: meeting,
        description: `Admin ${req.user.email} created meeting for request ${requestId}`
      };

      res.status(201).json({
        message: 'Meeting created successfully',
        meeting
      });

    } catch (error) {
      console.error('Admin meeting creation error:', error);
      res.status(500).json({ error: 'Failed to create meeting' });
    }
  }
);

// Update/reschedule meeting
router.patch('/meetings/:id',
  verifyToken,
  requireRole(['admin']),
  autoAuditLog(AUDIT_ACTIONS.UPDATE, 'meetings'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { 
        title, 
        description, 
        scheduledAt, 
        location, 
        durationMinutes, 
        notes, 
        status 
      } = req.body;

      // Get current meeting
      const currentMeetings = await query(
        'SELECT * FROM meetings WHERE id = ?',
        [id]
      );

      if (currentMeetings.length === 0) {
        return res.status(404).json({ error: 'Meeting not found' });
      }

      const currentMeeting = currentMeetings[0];

      // Build update query dynamically
      const updateFields = [];
      const updateValues = [];

      if (title !== undefined) {
        updateFields.push('title = ?');
        updateValues.push(title);
      }
      if (description !== undefined) {
        updateFields.push('description = ?');
        updateValues.push(description);
      }
      if (scheduledAt !== undefined) {
        updateFields.push('scheduled_at = ?');
        updateValues.push(scheduledAt);
      }
      if (location !== undefined) {
        updateFields.push('location = ?');
        updateValues.push(location);
      }
      if (durationMinutes !== undefined) {
        updateFields.push('duration_minutes = ?');
        updateValues.push(durationMinutes);
      }
      if (notes !== undefined) {
        updateFields.push('notes = ?');
        updateValues.push(notes);
      }
      if (status !== undefined) {
        updateFields.push('status = ?');
        updateValues.push(status);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      updateValues.push(id);

      // Update meeting
      await query(
        `UPDATE meetings SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      // Get updated meeting
      const updatedMeetings = await query(`
        SELECT m.*, 
               r.sender_id, r.receiver_id,
               sender.email as sender_email,
               receiver.email as receiver_email
        FROM meetings m
        JOIN requests r ON m.request_id = r.id
        LEFT JOIN users sender ON r.sender_id = sender.id
        LEFT JOIN users receiver ON r.receiver_id = receiver.id
        WHERE m.id = ?
      `, [id]);

      const updatedMeeting = updatedMeetings[0];

      // Store audit log data
      req.auditData = {
        oldValues: currentMeeting,
        newValues: updatedMeeting,
        description: `Admin ${req.user.email} updated meeting ${id}`
      };

      res.json({
        message: 'Meeting updated successfully',
        meeting: updatedMeeting
      });

    } catch (error) {
      console.error('Admin meeting update error:', error);
      res.status(500).json({ error: 'Failed to update meeting' });
    }
  }
);

// Get admin dashboard stats
router.get('/stats', 
  verifyToken,
  requireRole(['admin']),
  async (req, res) => {
    try {
      console.log('Admin API stats requested by user:', req.user.id);
      
      const userCount = await query('SELECT COUNT(*) as count FROM users');
      const activeUserCount = await query('SELECT COUNT(*) as count FROM users WHERE updated_at >= CURDATE() - INTERVAL 7 DAY');
      const listingCount = await query('SELECT COUNT(*) as count FROM listings WHERE is_active = 1');
      const totalListingCount = await query('SELECT COUNT(*) as count FROM listings');
      const requestCount = await query('SELECT COUNT(*) as count FROM requests WHERE status = "pending"');
      const totalRequestCount = await query('SELECT COUNT(*) as count FROM requests');
      const meetingCount = await query('SELECT COUNT(*) as count FROM meetings');

      // Recent activity for mobile display
      const recentActivity = await query(`
        SELECT 
          'USER_REGISTERED' as action,
          CONCAT('New user: ', COALESCE(name, email)) as description,
          COALESCE(name, 'Unknown') as userName,
          CAST(id as CHAR) as userId,
          created_at
        FROM users 
        WHERE created_at >= NOW() - INTERVAL 7 DAY
        ORDER BY created_at DESC 
        LIMIT 5
      `);

      const stats = {
        totalUsers: userCount[0].count,
        activeUsers: activeUserCount[0].count,
        totalListings: totalListingCount[0].count,
        activeListings: listingCount[0].count,
        totalRequests: totalRequestCount[0].count,
        pendingRequests: requestCount[0].count,
        totalMeetings: meetingCount[0].count,
        recentActivity: recentActivity.map(activity => ({
          id: activity.userId,
          action: activity.action,
          description: activity.description,
          userName: activity.userName,
          userId: activity.userId,
          createdAt: activity.created_at
        }))
      };

      console.log('Admin API stats compiled successfully');
      res.json(stats);
    } catch (error) {
      console.error('Admin API stats error:', error);
      res.status(500).json({
        error: 'Failed to fetch admin stats',
        message: error.message,
        totalUsers: 0,
        activeUsers: 0,
        totalListings: 0,
        activeListings: 0,
        totalRequests: 0,
        pendingRequests: 0,
        totalMeetings: 0,
        recentActivity: []
      });
    }
  }
);

// Get admin listings
router.get('/listings', 
  verifyToken,
  requireRole(['admin']),
  async (req, res) => {
    try {
      console.log('Admin API listings requested by user:', req.user.id);
      
      const { page = 1, limit = 20, status, type } = req.query;
      const offset = (page - 1) * limit;

      let whereConditions = [];
      let queryParams = [];

      if (status) {
        whereConditions.push('l.status = ?');
        queryParams.push(status);
      }

      if (type) {
        whereConditions.push('l.type = ?');
        queryParams.push(type);
      }

      const whereClause = whereConditions.length > 0 
        ? 'WHERE ' + whereConditions.join(' AND ')
        : '';

      const listings = await query(`
        SELECT l.id, l.title, l.description, l.type, l.price, l.currency,
               l.position, l.experience_level, l.location, l.status, 
               l.is_active, l.created_at, l.updated_at, l.expires_at,
               u.email as user_email, u.name as user_name
        FROM listings l
        LEFT JOIN users u ON l.user_id = u.id
        ${whereClause}
        ORDER BY l.created_at DESC
        LIMIT ? OFFSET ?
      `, [...queryParams, parseInt(limit), offset]);

      const totalCount = await query(`
        SELECT COUNT(*) as count 
        FROM listings l
        LEFT JOIN users u ON l.user_id = u.id
        ${whereClause}
      `, queryParams);

      const total = totalCount[0].count;
      const totalPages = Math.ceil(total / limit);

      console.log('Admin API listings fetched successfully:', listings.length);
      res.json({
        listings,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: totalPages
        }
      });
    } catch (error) {
      console.error('Admin API listings error:', error);
      res.status(500).json({
        error: 'Failed to fetch admin listings',
        message: error.message,
        listings: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 }
      });
    }
  }
);

// Get admin meetings
router.get('/meetings', 
  verifyToken,
  requireRole(['admin']),
  async (req, res) => {
    try {
      console.log('Admin API meetings requested by user:', req.user.id);
      
      const { page = 1, limit = 20, status, type } = req.query;
      const offset = (page - 1) * limit;

      let whereConditions = [];
      let queryParams = [];

      if (status) {
        whereConditions.push('m.status = ?');
        queryParams.push(status);
      }

      if (type) {
        whereConditions.push('m.meeting_type = ?');
        queryParams.push(type);
      }

      const whereClause = whereConditions.length > 0 
        ? 'WHERE ' + whereConditions.join(' AND ')
        : '';

      const meetings = await query(`
        SELECT m.id, m.title, m.description, m.meeting_type, m.status,
               m.start_at, m.end_at, m.location, m.location_uri, 
               m.duration_minutes, m.notes, m.created_at, m.updated_at,
               coach.email as coach_email, coach.name as coach_name,
               player.email as player_email, player.name as player_name,
               creator.email as created_by_email, creator.name as created_by_name,
               r.id as request_id, r.message as request_message
        FROM meetings m
        LEFT JOIN users coach ON m.coach_user_id = coach.id
        LEFT JOIN users player ON m.player_user_id = player.id
        LEFT JOIN users creator ON m.created_by = creator.id
        LEFT JOIN requests r ON m.request_id = r.id
        ${whereClause}
        ORDER BY m.start_at DESC
        LIMIT ? OFFSET ?
      `, [...queryParams, parseInt(limit), offset]);

      const totalCount = await query(`
        SELECT COUNT(*) as count 
        FROM meetings m
        LEFT JOIN users coach ON m.coach_user_id = coach.id
        LEFT JOIN users player ON m.player_user_id = player.id
        LEFT JOIN users creator ON m.created_by = creator.id
        LEFT JOIN requests r ON m.request_id = r.id
        ${whereClause}
      `, queryParams);

      const total = totalCount[0].count;
      const totalPages = Math.ceil(total / limit);

      console.log('Admin API meetings fetched successfully:', meetings.length);
      res.json({
        meetings,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: totalPages
        }
      });
    } catch (error) {
      console.error('Admin API meetings error:', error);
      res.status(500).json({
        error: 'Failed to fetch admin meetings',
        message: error.message,
        meetings: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 }
      });
    }
  }
);

// Get admin users endpoint
router.get('/users', 
  verifyToken,
  requireRole(['admin']),
  async (req, res) => {
    try {
      console.log('Admin API users requested by user:', req.user.id);
      
      const { page = 1, limit = 20, role, status } = req.query;
      const offset = (page - 1) * limit;

      let whereConditions = [];
      let queryParams = [];

      if (role) {
        whereConditions.push('u.role = ?');
        queryParams.push(role);
      }

      if (status) {
        whereConditions.push('u.status = ?');
        queryParams.push(status);
      }

      const whereClause = whereConditions.length > 0 
        ? 'WHERE ' + whereConditions.join(' AND ')
        : '';

      const users = await query(`
        SELECT u.id, u.email, u.name, u.first_name, u.last_name, 
               u.avatar_url, u.phone, u.role, u.status, u.is_active,
               u.last_login_at, u.created_at, u.updated_at
        FROM users u
        ${whereClause}
        ORDER BY u.created_at DESC
        LIMIT ? OFFSET ?
      `, [...queryParams, parseInt(limit), offset]);

      const totalCount = await query(`
        SELECT COUNT(*) as count 
        FROM users u
        ${whereClause}
      `, queryParams);

      const total = totalCount[0].count;
      const totalPages = Math.ceil(total / limit);

      console.log('Admin API users fetched successfully:', users.length);
      res.json({
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: totalPages
        }
      });
    } catch (error) {
      console.error('Admin API users error:', error);
      res.status(500).json({
        error: 'Failed to fetch admin users',
        message: error.message,
        users: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 }
      });
    }
  }
);

module.exports = router;
