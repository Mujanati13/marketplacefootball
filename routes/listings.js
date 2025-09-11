const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { verifyToken, requireRole, requireOwnershipOrAdmin } = require('../middleware/auth');
const { validateListing, validateId, validatePagination } = require('../middleware/validation');
const { autoAuditLog, AUDIT_ACTIONS } = require('../middleware/audit');

// Create listing
router.post('/',
  verifyToken,
  validateListing,
  autoAuditLog(AUDIT_ACTIONS.CREATE_LISTING, 'listing'),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { 
        title, 
        description, 
        type, 
        price = 0,
        currency = 'USD',
        position, 
        experience_level, 
        location, 
        salary_range, 
        requirements 
      } = req.body;

      // Check if user can create listings
      if (!['player', 'coach', 'club_representative'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Only players, coaches, and club representatives can create listings' });
      }

      // Create listing
      const result = await query(
        `INSERT INTO listings (user_id, title, description, type, price, currency, position, experience_level, location, salary_range, requirements)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          title,
          description || null,
          type,
          price,
          currency,
          position || null,
          experience_level || null,
          location || null,
          salary_range || null,
          requirements || null
        ]
      );

      // Get created listing with owner details
      const listings = await query(
        `SELECT l.*, 
               CONCAT(p.first_name, ' ', p.last_name) as owner_name, 
               p.avatar_url as owner_avatar
         FROM listings l
         JOIN users u ON l.user_id = u.id
         LEFT JOIN profiles p ON u.id = p.user_id
         WHERE l.id = ?`,
        [result.insertId]
      );

      res.status(201).json({
        message: 'Listing created successfully',
        listing: listings[0]
      });

    } catch (error) {
      console.error('Create listing error:', error);
      res.status(500).json({ error: 'Failed to create listing' });
    }
  }
);

// Get all listings (marketplace)
router.get('/',
  validatePagination,
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;
      const {
        type,
        experience_level,
        search,
        location
      } = req.query;

      let sql = `
        SELECT l.*, 
               CONCAT(p.first_name, ' ', p.last_name) as owner_name, 
               p.avatar_url as owner_avatar,
               p.location, p.experience_level, u.email as owner_email
        FROM listings l
        JOIN users u ON l.user_id = u.id
        LEFT JOIN profiles p ON u.id = p.user_id
        WHERE l.is_active = true AND u.status = 'active'
      `;
      const params = [];

      if (type) {
        sql += ' AND l.type = ?';
        params.push(type);
      }

      if (experience_level) {
        sql += ' AND l.experience_level = ?';
        params.push(experience_level);
      }

      if (location) {
        sql += ' AND p.location LIKE ?';
        params.push(`%${location}%`);
      }

      if (search) {
        sql += ' AND (l.title LIKE ? OR l.description LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }

      sql += ` ORDER BY l.created_at DESC LIMIT ${limit} OFFSET ${offset}`;

      const listings = await query(sql, params);

      // Get total count for pagination
      let countSql = `
        SELECT COUNT(*) as total
        FROM listings l
        JOIN users u ON l.user_id = u.id
        LEFT JOIN profiles p ON u.id = p.user_id
        WHERE l.is_active = true AND u.status = 'active'
      `;
      const countParams = [];

      if (type) {
        countSql += ' AND l.type = ?';
        countParams.push(type);
      }

      if (experience_level) {
        countSql += ' AND l.experience_level = ?';
        countParams.push(experience_level);
      }

      if (location) {
        countSql += ' AND p.location LIKE ?';
        countParams.push(`%${location}%`);
      }

      if (search) {
        countSql += ' AND (l.title LIKE ? OR l.description LIKE ?)';
        countParams.push(`%${search}%`, `%${search}%`);
      }

      const totalResult = await query(countSql, countParams);
      const total = totalResult[0].total;

      res.json({
        listings,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Get listings error:', error);
      res.status(500).json({ error: 'Failed to get listings' });
    }
  }
);

// Get listing by ID
router.get('/:id',
  validateId,
  async (req, res) => {
    try {
      const listingId = req.params.id;

      const listings = await query(
        `SELECT l.*, u.name as owner_name, u.email as owner_email, 
                u.avatar_url as owner_avatar, u.created_at as owner_since,
                p.bio, p.location, p.years_experience, p.skills, p.positions
         FROM listings l
         JOIN users u ON l.user_id = u.id
         LEFT JOIN profiles p ON u.id = p.user_id
         WHERE l.id = ? AND u.is_active = true`,
        [listingId]
      );

      if (listings.length === 0) {
        return res.status(404).json({ error: 'Listing not found' });
      }

      res.json({ listing: listings[0] });

    } catch (error) {
      console.error('Get listing error:', error);
      res.status(500).json({ error: 'Failed to get listing' });
    }
  }
);

// Get my listings
router.get('/my/listings',
  verifyToken,
  validatePagination,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;
      const status = req.query.status;

      let sql = `
        SELECT l.*, u.name as owner_name, u.avatar_url as owner_avatar
        FROM listings l
        JOIN users u ON l.user_id = u.id
        WHERE l.user_id = ?
      `;
      const params = [userId];

      if (status) {
        sql += ' AND l.status = ?';
        params.push(status);
      }

      sql += ' ORDER BY l.created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const listings = await query(sql, params);

      // Get total count
      let countSql = 'SELECT COUNT(*) as total FROM listings WHERE user_id = ?';
      const countParams = [userId];

      if (status) {
        countSql += ' AND status = ?';
        countParams.push(status);
      }

      const totalResult = await query(countSql, countParams);
      const total = totalResult[0].total;

      res.json({
        listings,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Get my listings error:', error);
      res.status(500).json({ error: 'Failed to get your listings' });
    }
  }
);

// Update listing
router.put('/:id',
  verifyToken,
  validateId,
  validateListing,
  requireOwnershipOrAdmin(async (req) => {
    const listings = await query('SELECT user_id FROM listings WHERE id = ?', [req.params.id]);
    return listings.length > 0 ? listings[0].user_id : null;
  }),
  autoAuditLog(AUDIT_ACTIONS.UPDATE_LISTING, 'listing'),
  async (req, res) => {
    try {
      const listingId = req.params.id;
      const { type, title, description, price, currency, media } = req.body;

      // Check if listing exists
      const existingListings = await query(
        'SELECT id, user_id FROM listings WHERE id = ?',
        [listingId]
      );

      if (existingListings.length === 0) {
        return res.status(404).json({ error: 'Listing not found' });
      }

      // Verify type matches user role (unless admin)
      if (req.user.role !== 'admin' && type !== req.user.role) {
        return res.status(400).json({ error: 'Listing type must match your role' });
      }

      // Build update query dynamically
      const updates = [];
      const params = [];

      if (type !== undefined) {
        updates.push('type = ?');
        params.push(type);
      }
      if (title !== undefined) {
        updates.push('title = ?');
        params.push(title);
      }
      if (description !== undefined) {
        updates.push('description = ?');
        params.push(description);
      }
      if (price !== undefined) {
        updates.push('price = ?');
        params.push(price);
      }
      if (currency !== undefined) {
        updates.push('currency = ?');
        params.push(currency);
      }
      if (media !== undefined) {
        updates.push('media = ?');
        params.push(JSON.stringify(media));
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      params.push(listingId);

      await query(
        `UPDATE listings SET ${updates.join(', ')} WHERE id = ?`,
        params
      );

      // Get updated listing
      const listings = await query(
        `SELECT l.*, u.name as owner_name, u.avatar_url as owner_avatar
         FROM listings l
         JOIN users u ON l.user_id = u.id
         WHERE l.id = ?`,
        [listingId]
      );

      res.json({
        message: 'Listing updated successfully',
        listing: listings[0]
      });

    } catch (error) {
      console.error('Update listing error:', error);
      res.status(500).json({ error: 'Failed to update listing' });
    }
  }
);

// Toggle listing status (pause/activate)
router.patch('/:id/status',
  verifyToken,
  validateId,
  requireOwnershipOrAdmin(async (req) => {
    const listings = await query('SELECT user_id FROM listings WHERE id = ?', [req.params.id]);
    return listings.length > 0 ? listings[0].user_id : null;
  }),
  autoAuditLog(AUDIT_ACTIONS.UPDATE_LISTING, 'listing'),
  async (req, res) => {
    try {
      const listingId = req.params.id;
      const { status } = req.body;

      if (!['active', 'paused'].includes(status)) {
        return res.status(400).json({ error: 'Status must be active or paused' });
      }

      // Check if listing exists
      const listings = await query(
        'SELECT id, status FROM listings WHERE id = ?',
        [listingId]
      );

      if (listings.length === 0) {
        return res.status(404).json({ error: 'Listing not found' });
      }

      // Update status
      await query(
        'UPDATE listings SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [status, listingId]
      );

      res.json({
        message: `Listing ${status === 'active' ? 'activated' : 'paused'} successfully`
      });

    } catch (error) {
      console.error('Update listing status error:', error);
      res.status(500).json({ error: 'Failed to update listing status' });
    }
  }
);

// Delete listing
router.delete('/:id',
  verifyToken,
  validateId,
  requireOwnershipOrAdmin(async (req) => {
    const listings = await query('SELECT user_id FROM listings WHERE id = ?', [req.params.id]);
    return listings.length > 0 ? listings[0].user_id : null;
  }),
  autoAuditLog(AUDIT_ACTIONS.DELETE_LISTING, 'listing'),
  async (req, res) => {
    try {
      const listingId = req.params.id;

      // Check if listing exists
      const listings = await query(
        'SELECT id FROM listings WHERE id = ?',
        [listingId]
      );

      if (listings.length === 0) {
        return res.status(404).json({ error: 'Listing not found' });
      }

      // Delete listing
      await query('DELETE FROM listings WHERE id = ?', [listingId]);

      res.json({ message: 'Listing deleted successfully' });

    } catch (error) {
      console.error('Delete listing error:', error);
      res.status(500).json({ error: 'Failed to delete listing' });
    }
  }
);

module.exports = router;
