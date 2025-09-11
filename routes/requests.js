const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { verifyToken, requireRole } = require('../middleware/auth');
const { validateId } = require('../middleware/validation');
const { autoAuditLog, AUDIT_ACTIONS } = require('../middleware/audit');

// Create request
router.post('/',
  verifyToken,
  autoAuditLog(AUDIT_ACTIONS.CREATE_REQUEST, 'request'),
  async (req, res) => {
    try {
      const { target_user_id, listing_id, type, message } = req.body;
      const sender_id = req.user.id;

      // Validate required fields
      if (!target_user_id || !type) {
        return res.status(400).json({ error: 'target_user_id and type are required' });
      }

      if (!['buy', 'hire'].includes(type)) {
        return res.status(400).json({ error: 'Type must be buy or hire' });
      }

      // Check if target user exists
      const targetUsers = await query('SELECT id, role FROM users WHERE id = ? AND is_active = true', [target_user_id]);
      if (targetUsers.length === 0) {
        return res.status(404).json({ error: 'Target user not found' });
      }

      // Check if listing exists (if provided)
      if (listing_id) {
        const listings = await query('SELECT id FROM listings WHERE id = ? AND is_active = true', [listing_id]);
        if (listings.length === 0) {
          return res.status(404).json({ error: 'Listing not found' });
        }
      }

      // Check if request already exists
      const existingRequests = await query(
        'SELECT id FROM requests WHERE sender_id = ? AND target_user_id = ? AND listing_id = ? AND status = "pending"',
        [sender_id, target_user_id, listing_id || null]
      );

      if (existingRequests.length > 0) {
        return res.status(400).json({ error: 'A pending request already exists for this listing' });
      }

      // Create request
      const result = await query(
        `INSERT INTO requests (sender_id, target_user_id, listing_id, type, message) 
         VALUES (?, ?, ?, ?, ?)`,
        [sender_id, target_user_id, listing_id || null, type, message]
      );

      const requestId = result.insertId;

      // Create conversation for this request
      const conversationResult = await query(
        `INSERT INTO conversations (type, request_id, user1_id, user2_id, created_by_user_id)
         VALUES (?, ?, ?, ?, ?)`,
        ['deal', requestId, sender_id, target_user_id, sender_id]
      );

      // Get the created request with details
      const requests = await query(
        `SELECT r.*, 
                ru.name as requester_name, ru.email as requester_email,
                tu.name as target_name, tu.email as target_email,
                l.title as listing_title
         FROM requests r
         JOIN users ru ON r.sender_id = ru.id
         JOIN users tu ON r.target_user_id = tu.id
         LEFT JOIN listings l ON r.listing_id = l.id
         WHERE r.id = ?`,
        [requestId]
      );

      // Emit real-time notification
      const io = req.app.get('io');
      if (io) {
        const newRequest = requests[0];
        io.to(`user_${target_user_id}`).emit('new_request', {
          request: newRequest,
          message: `New ${type} request from ${newRequest.requester_name}`
        });
      }

      res.status(201).json({
        message: 'Request created successfully',
        request: requests[0],
        conversation_id: conversationResult.insertId
      });

    } catch (error) {
      console.error('Create request error:', error);
      res.status(500).json({ error: 'Failed to create request' });
    }
  }
);

// Get all requests (admin only)
router.get('/',
  verifyToken,
  requireRole(['admin']),
  async (req, res) => {
    try {
      const { page = 1, limit = 20, status, type } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      let sql = `
        SELECT r.*, 
               ru.name as requester_name, ru.email as requester_email,
               tu.name as target_name, tu.email as target_email,
               l.title as listing_title
        FROM requests r
        JOIN users ru ON r.sender_id = ru.id
        JOIN users tu ON r.target_user_id = tu.id
        LEFT JOIN listings l ON r.listing_id = l.id
        WHERE 1=1
      `;
      const params = [];

      if (status) {
        sql += ' AND r.status = ?';
        params.push(status);
      }

      if (type) {
        sql += ' AND r.type = ?';
        params.push(type);
      }

      sql += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit));
      params.push(offset);

      const requests = await query(sql, params);

      // Get total count
      let countSql = `
        SELECT COUNT(*) as total
        FROM requests r
        WHERE 1=1
      `;
      const countParams = [];

      if (status) {
        countSql += ' AND r.status = ?';
        countParams.push(status);
      }

      if (type) {
        countSql += ' AND r.type = ?';
        countParams.push(type);
      }

      const countResult = await query(countSql, countParams);
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
      console.error('Get requests error:', error);
      res.status(500).json({ error: 'Failed to get requests' });
    }
  }
);

// Get sent requests (current user)
router.get('/my/sent',
  verifyToken,
  async (req, res) => {
    try {
      const { page = 1, limit = 20, status } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      const userId = req.user.id;

      let sql = `
        SELECT r.*, 
               tu.name as target_name, tu.email as target_email,
               l.title as listing_title
        FROM requests r
        JOIN users tu ON r.target_user_id = tu.id
        LEFT JOIN listings l ON r.listing_id = l.id
        WHERE r.sender_id = ?
      `;
      const params = [userId];

      if (status) {
        sql += ' AND r.status = ?';
        params.push(status);
      }

      sql += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit));
      params.push(offset);

      const requests = await query(sql, params);

      res.json({ requests });

    } catch (error) {
      console.error('Get sent requests error:', error);
      res.status(500).json({ error: 'Failed to get sent requests' });
    }
  }
);

// Get received requests (current user)
router.get('/my/received',
  verifyToken,
  async (req, res) => {
    try {
      const { page = 1, limit = 20, status } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      const userId = req.user.id;

      let sql = `
        SELECT r.*, 
               ru.name as requester_name, 
               ru.email as requester_email,
               ru.first_name as requester_first_name,
               ru.last_name as requester_last_name,
               l.title as listing_title
        FROM requests r
        JOIN users ru ON r.sender_id = ru.id
        LEFT JOIN listings l ON r.listing_id = l.id
        WHERE r.target_user_id = ?
      `;
      const params = [userId];

      if (status) {
        sql += ' AND r.status = ?';
        params.push(status);
      }

      sql += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit));
      params.push(offset);

      const requests = await query(sql, params);

      // Format the response to include customer object
      const formattedRequests = requests.map(request => ({
        ...request,
        customer: {
          id: request.sender_id,
          firstName: request.requester_first_name || 'Unknown',
          lastName: request.requester_last_name || 'User',
          email: request.requester_email
        }
      }));

      res.json({ requests: formattedRequests });

    } catch (error) {
      console.error('Get received requests error:', error);
      res.status(500).json({ error: 'Failed to get received requests' });
    }
  }
);

// Get single request
router.get('/:id',
  verifyToken,
  validateId,
  async (req, res) => {
    try {
      const requestId = req.params.id;
      const userId = req.user.id;
      const userRole = req.user.role;

      const requests = await query(
        `SELECT r.*, 
                ru.name as requester_name, ru.email as requester_email,
                tu.name as target_name, tu.email as target_email,
                l.title as listing_title
         FROM requests r
         JOIN users ru ON r.sender_id = ru.id
         JOIN users tu ON r.target_user_id = tu.id
         LEFT JOIN listings l ON r.listing_id = l.id
         WHERE r.id = ?`,
        [requestId]
      );

      if (requests.length === 0) {
        return res.status(404).json({ error: 'Request not found' });
      }

      const request = requests[0];

      // Check permissions
      if (userRole !== 'admin' && userId !== request.sender_id && userId !== request.target_user_id) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      res.json({ request });

    } catch (error) {
      console.error('Get request error:', error);
      res.status(500).json({ error: 'Failed to get request' });
    }
  }
);

// User can accept/reject requests they received
router.patch('/:id/respond',
  verifyToken,
  validateId,
  autoAuditLog(AUDIT_ACTIONS.UPDATE_REQUEST_STATUS, 'request'),
  async (req, res) => {
    try {
      const requestId = req.params.id;
      const { status } = req.body;
      const userId = req.user.id;

      if (!['accepted', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Status must be accepted or rejected' });
      }

      // Check if request exists and user is the target
      const requests = await query(
        'SELECT id, status, sender_id, target_user_id FROM requests WHERE id = ? AND target_user_id = ?',
        [requestId, userId]
      );

      if (requests.length === 0) {
        return res.status(404).json({ error: 'Request not found or insufficient permissions' });
      }

      const request = requests[0];

      if (request.status !== 'pending') {
        return res.status(400).json({ error: 'Only pending requests can be updated' });
      }

      // Update request status
      await query(
        'UPDATE requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [status, requestId]
      );

      // Get updated request
      const updatedRequests = await query(
        `SELECT r.*, 
                ru.name as requester_name, ru.email as requester_email,
                tu.name as target_name, tu.email as target_email,
                l.title as listing_title
         FROM requests r
         JOIN users ru ON r.sender_id = ru.id
         JOIN users tu ON r.target_user_id = tu.id
         LEFT JOIN listings l ON r.listing_id = l.id
         WHERE r.id = ?`,
        [requestId]
      );

      const updatedRequest = updatedRequests[0];

      // Emit real-time notification to requester
      const io = req.app.get('io');
      if (io) {
        io.to(`user_${request.sender_id}`).emit('request_updated', {
          request: updatedRequest,
          message: `Your request has been ${status}`
        });
      }

      res.json({
        message: `Request ${status} successfully`,
        request: updatedRequest
      });

    } catch (error) {
      console.error('Update request status error:', error);
      res.status(500).json({ error: 'Failed to update request status' });
    }
  }
);

// Update request status (admin only)
router.patch('/:id/status',
  verifyToken,
  validateId,
  requireRole(['admin']),
  autoAuditLog(AUDIT_ACTIONS.UPDATE_REQUEST_STATUS, 'request'),
  async (req, res) => {
    try {
      const requestId = req.params.id;
      const { status } = req.body;
      const adminId = req.user.id;

      if (!['approved', 'rejected', 'cancelled'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      // Map mobile app status values to database enum values
      const statusMapping = {
        'approved': 'accepted',
        'rejected': 'rejected',
        'cancelled': 'cancelled'
      };
      const dbStatus = statusMapping[status];

      // Check if request exists and is pending
      const requests = await query(
        'SELECT id, status, sender_id, target_user_id FROM requests WHERE id = ?',
        [requestId]
      );

      if (requests.length === 0) {
        return res.status(404).json({ error: 'Request not found' });
      }

      const request = requests[0];

      if (request.status !== 'pending') {
        return res.status(400).json({ error: 'Only pending requests can be updated' });
      }

      // Update request status
      await query(
        'UPDATE requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [dbStatus, requestId]
      );

      // Get updated request
      const updatedRequests = await query(
        `SELECT r.*, 
                ru.name as requester_name, ru.email as requester_email,
                tu.name as target_name, tu.email as target_email,
                l.title as listing_title
         FROM requests r
         JOIN users ru ON r.sender_id = ru.id
         JOIN users tu ON r.target_user_id = tu.id
         LEFT JOIN listings l ON r.listing_id = l.id
         WHERE r.id = ?`,
        [requestId]
      );

      const updatedRequest = updatedRequests[0];

      // Emit real-time notifications
      const io = req.app.get('io');
      if (io) {
        io.to(`user_${request.sender_id}`).emit('request_updated', {
          request: updatedRequest,
          message: `Your request has been ${status} by admin`
        });

        io.to(`user_${request.target_user_id}`).emit('request_updated', {
          request: updatedRequest,
          message: `Request ${status} by admin`
        });
      }

      res.json({
        message: `Request ${status} successfully`,
        request: updatedRequest
      });

    } catch (error) {
      console.error('Admin update request status error:', error);
      res.status(500).json({ error: 'Failed to update request status' });
    }
  }
);

// Cancel request (sender only)
router.patch('/:id/cancel',
  verifyToken,
  validateId,
  autoAuditLog(AUDIT_ACTIONS.CANCEL_REQUEST, 'request'),
  async (req, res) => {
    try {
      const requestId = req.params.id;
      const userId = req.user.id;

      // Check if request exists and user is the sender
      const requests = await query(
        'SELECT id, status, sender_id, target_user_id FROM requests WHERE id = ? AND sender_id = ?',
        [requestId, userId]
      );

      if (requests.length === 0) {
        return res.status(404).json({ error: 'Request not found or insufficient permissions' });
      }

      const request = requests[0];

      if (request.status !== 'pending') {
        return res.status(400).json({ error: 'Only pending requests can be cancelled' });
      }

      // Update request status
      await query(
        'UPDATE requests SET status = "cancelled", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [requestId]
      );

      // Get updated request
      const updatedRequests = await query(
        `SELECT r.*, 
                ru.name as requester_name, ru.email as requester_email,
                tu.name as target_name, tu.email as target_email,
                l.title as listing_title
         FROM requests r
         JOIN users ru ON r.sender_id = ru.id
         JOIN users tu ON r.target_user_id = tu.id
         LEFT JOIN listings l ON r.listing_id = l.id
         WHERE r.id = ?`,
        [requestId]
      );

      const updatedRequest = updatedRequests[0];

      // Emit real-time notification
      const io = req.app.get('io');
      if (io) {
        io.to(`user_${request.target_user_id}`).emit('request_updated', {
          request: updatedRequest,
          message: `Request has been cancelled`
        });
      }

      res.json({
        message: 'Request cancelled successfully',
        request: updatedRequest
      });

    } catch (error) {
      console.error('Cancel request error:', error);
      res.status(500).json({ error: 'Failed to cancel request' });
    }
  }
);

module.exports = router;
