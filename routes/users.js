const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { verifyToken, requireRole, requireOwnershipOrAdmin } = require('../middleware/auth');
const { validateUserUpdate, validateId, validatePagination } = require('../middleware/validation');
const { autoAuditLog, AUDIT_ACTIONS } = require('../middleware/audit');

// Get all users (admin only)
router.get('/',
  verifyToken,
  requireRole(['admin']),
  validatePagination,
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;
      const role = req.query.role;
      const search = req.query.search;

      let sql = `
        SELECT id, email, name, role, phone, avatar_url, is_active, created_at, updated_at
        FROM users 
        WHERE 1=1
      `;
      const params = [];

      if (role) {
        sql += ' AND role = ?';
        params.push(role);
      }

      if (search) {
        sql += ' AND (name LIKE ? OR email LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }

      sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const users = await query(sql, params);

      // Get total count
      let countSql = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
      const countParams = [];

      if (role) {
        countSql += ' AND role = ?';
        countParams.push(role);
      }

      if (search) {
        countSql += ' AND (name LIKE ? OR email LIKE ?)';
        countParams.push(`%${search}%`, `%${search}%`);
      }

      const totalResult = await query(countSql, countParams);
      const total = totalResult[0].total;

      res.json({
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ error: 'Failed to get users' });
    }
  }
);

// Get current user profile
router.get('/profile',
  verifyToken,
  async (req, res) => {
    try {
      const userId = req.user.id;

      // Get user basic info
      const users = await query(
        `SELECT id, email, role, status, created_at, updated_at FROM users WHERE id = ?`,
        [userId]
      );

      if (users.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = users[0];

      // Get user profile if exists
      const profiles = await query(
        `SELECT * FROM profiles WHERE user_id = ?`,
        [userId]
      );

      if (profiles.length > 0) {
        user.profile = profiles[0];
      }

      res.json(user);
    } catch (error) {
      console.error('Get current user profile error:', error);
      res.status(500).json({ error: 'Failed to get profile' });
    }
  }
);

// Get user by ID
router.get('/:id',
  verifyToken,
  validateId,
  requireOwnershipOrAdmin(async (req) => {
    const users = await query('SELECT id FROM users WHERE id = ?', [req.params.id]);
    return users.length > 0 ? parseInt(req.params.id) : null;
  }),
  async (req, res) => {
    try {
      const userId = req.params.id;

      const users = await query(
        `SELECT id, email, name, role, phone, avatar_url, is_active, created_at, updated_at 
         FROM users WHERE id = ?`,
        [userId]
      );

      if (users.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = users[0];

      // If user has a profile, include it
      if (user.role === 'player' || user.role === 'coach') {
        const profiles = await query(
          `SELECT * FROM profiles WHERE user_id = ?`,
          [userId]
        );

        if (profiles.length > 0) {
          user.profile = profiles[0];
        }
      }

      res.json({ user });

    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: 'Failed to get user' });
    }
  }
);

// Update my profile (authenticated user)
router.patch('/me',
  verifyToken,
  validateUserUpdate,
  autoAuditLog(AUDIT_ACTIONS.UPDATE, 'users'),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { first_name, last_name, avatar_url, phone } = req.body;

      // Get current user data for audit log
      const currentUsers = await query(
        'SELECT * FROM users WHERE id = ?',
        [userId]
      );

      if (currentUsers.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const currentUser = currentUsers[0];

      // Build update query dynamically
      const updateFields = [];
      const updateValues = [];

      if (first_name !== undefined) {
        updateFields.push('first_name = ?');
        updateValues.push(first_name);
      }
      if (last_name !== undefined) {
        updateFields.push('last_name = ?');
        updateValues.push(last_name);
      }
      if (avatar_url !== undefined) {
        updateFields.push('avatar_url = ?');
        updateValues.push(avatar_url);
      }
      if (phone !== undefined) {
        updateFields.push('phone = ?');
        updateValues.push(phone);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      updateValues.push(userId);

      // Update user
      await query(
        `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      // Get updated user
      const updatedUsers = await query(
        `SELECT id, email, first_name, last_name, role, phone, avatar_url, status, created_at, updated_at 
         FROM users WHERE id = ?`,
        [userId]
      );

      const updatedUser = updatedUsers[0];

      // Store audit log data
      req.auditData = {
        oldValues: currentUser,
        newValues: updatedUser,
        description: `User ${req.user.email} updated their profile`
      };

      res.json({
        message: 'Profile updated successfully',
        user: updatedUser
      });

    } catch (error) {
      console.error('Update user profile error:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }
);

// Update user
router.put('/:id',
  verifyToken,
  validateId,
  validateUserUpdate,
  requireOwnershipOrAdmin(async (req) => {
    const users = await query('SELECT id FROM users WHERE id = ?', [req.params.id]);
    return users.length > 0 ? parseInt(req.params.id) : null;
  }),
  autoAuditLog(AUDIT_ACTIONS.UPDATE_USER, 'user'),
  async (req, res) => {
    try {
      const userId = req.params.id;
      const { email, name, phone, avatar_url } = req.body;

      // Check if user exists
      const existingUsers = await query(
        'SELECT id FROM users WHERE id = ?',
        [userId]
      );

      if (existingUsers.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Check if email is already taken by another user
      if (email) {
        const emailUsers = await query(
          'SELECT id FROM users WHERE email = ? AND id != ?',
          [email, userId]
        );

        if (emailUsers.length > 0) {
          return res.status(409).json({ error: 'Email already in use' });
        }
      }

      // Build update query dynamically
      const updates = [];
      const params = [];

      if (email !== undefined) {
        updates.push('email = ?');
        params.push(email);
      }
      if (name !== undefined) {
        updates.push('name = ?');
        params.push(name);
      }
      if (phone !== undefined) {
        updates.push('phone = ?');
        params.push(phone);
      }
      if (avatar_url !== undefined) {
        updates.push('avatar_url = ?');
        params.push(avatar_url);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      params.push(userId);

      await query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
        params
      );

      // Get updated user
      const users = await query(
        'SELECT id, email, name, role, phone, avatar_url, is_active, created_at, updated_at FROM users WHERE id = ?',
        [userId]
      );

      res.json({
        message: 'User updated successfully',
        user: users[0]
      });

    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ error: 'Failed to update user' });
    }
  }
);

module.exports = router;
