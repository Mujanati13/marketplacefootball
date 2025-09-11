const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { verifyToken, requireRole, requireOwnershipOrAdmin } = require('../middleware/auth');
const { validateProfile, validateId } = require('../middleware/validation');
const { autoAuditLog, AUDIT_ACTIONS } = require('../middleware/audit');

// Create profile
router.post('/',
  verifyToken,
  validateProfile,
  autoAuditLog(AUDIT_ACTIONS.CREATE_PROFILE, 'profile'),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const {
        type,
        bio,
        location,
        years_experience,
        hourly_rate,
        currency,
        positions,
        skills,
        tags,
        media
      } = req.body;

      // Check if user can have a profile
      if (!['player', 'coach'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Only players and coaches can have profiles' });
      }

      // Check if user already has a profile
      const existingProfiles = await query(
        'SELECT id FROM profiles WHERE user_id = ?',
        [userId]
      );

      if (existingProfiles.length > 0) {
        return res.status(409).json({ error: 'Profile already exists' });
      }

      // Create profile
      const result = await query(
        `INSERT INTO profiles (
          user_id, type, bio, location, years_experience, hourly_rate, currency,
          positions, skills, tags, media
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          type,
          bio,
          location,
          years_experience,
          hourly_rate,
          currency || 'USD',
          JSON.stringify(positions || []),
          JSON.stringify(skills || []),
          JSON.stringify(tags || []),
          JSON.stringify(media || [])
        ]
      );

      // Get created profile
      const profiles = await query(
        'SELECT * FROM profiles WHERE id = ?',
        [result.insertId]
      );

      res.status(201).json({
        message: 'Profile created successfully',
        profile: profiles[0]
      });

    } catch (error) {
      console.error('Create profile error:', error);
      res.status(500).json({ error: 'Failed to create profile' });
    }
  }
);

// Get profile by user ID
router.get('/user/:userId',
  verifyToken,
  validateId,
  async (req, res) => {
    try {
      const userId = req.params.userId;

      const profiles = await query(
        `SELECT p.*, u.name, u.email, u.avatar_url, u.created_at as user_created_at
         FROM profiles p
         JOIN users u ON p.user_id = u.id
         WHERE p.user_id = ? AND u.is_active = true`,
        [userId]
      );

      if (profiles.length === 0) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      res.json({ profile: profiles[0] });

    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ error: 'Failed to get profile' });
    }
  }
);

// Get my profile
router.get('/me',
  verifyToken,
  async (req, res) => {
    try {
      const userId = req.user.id;

      const profiles = await query(
        'SELECT * FROM profiles WHERE user_id = ?',
        [userId]
      );

      if (profiles.length === 0) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      res.json({ profile: profiles[0] });

    } catch (error) {
      console.error('Get my profile error:', error);
      res.status(500).json({ error: 'Failed to get profile' });
    }
  }
);

// Update profile
router.put('/:id',
  verifyToken,
  validateId,
  validateProfile,
  requireOwnershipOrAdmin(async (req) => {
    const profiles = await query('SELECT user_id FROM profiles WHERE id = ?', [req.params.id]);
    return profiles.length > 0 ? profiles[0].user_id : null;
  }),
  autoAuditLog(AUDIT_ACTIONS.UPDATE_PROFILE, 'profile'),
  async (req, res) => {
    try {
      const profileId = req.params.id;
      const {
        type,
        bio,
        location,
        years_experience,
        hourly_rate,
        currency,
        positions,
        skills,
        tags,
        media
      } = req.body;

      // Check if profile exists
      const existingProfiles = await query(
        'SELECT id, user_id FROM profiles WHERE id = ?',
        [profileId]
      );

      if (existingProfiles.length === 0) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      // Build update query dynamically
      const updates = [];
      const params = [];

      if (type !== undefined) {
        updates.push('type = ?');
        params.push(type);
      }
      if (bio !== undefined) {
        updates.push('bio = ?');
        params.push(bio);
      }
      if (location !== undefined) {
        updates.push('location = ?');
        params.push(location);
      }
      if (years_experience !== undefined) {
        updates.push('years_experience = ?');
        params.push(years_experience);
      }
      if (hourly_rate !== undefined) {
        updates.push('hourly_rate = ?');
        params.push(hourly_rate);
      }
      if (currency !== undefined) {
        updates.push('currency = ?');
        params.push(currency);
      }
      if (positions !== undefined) {
        updates.push('positions = ?');
        params.push(JSON.stringify(positions));
      }
      if (skills !== undefined) {
        updates.push('skills = ?');
        params.push(JSON.stringify(skills));
      }
      if (tags !== undefined) {
        updates.push('tags = ?');
        params.push(JSON.stringify(tags));
      }
      if (media !== undefined) {
        updates.push('media = ?');
        params.push(JSON.stringify(media));
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      params.push(profileId);

      await query(
        `UPDATE profiles SET ${updates.join(', ')} WHERE id = ?`,
        params
      );

      // Get updated profile
      const profiles = await query(
        'SELECT * FROM profiles WHERE id = ?',
        [profileId]
      );

      res.json({
        message: 'Profile updated successfully',
        profile: profiles[0]
      });

    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }
);

// Get players with filters (public endpoint)
router.get('/players', async (req, res) => {
  try {
    const {
      skills,
      positions, 
      min_rate,
      max_rate,
      location,
      page = 1,
      limit = 20
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    let sql = `
      SELECT p.*, u.first_name, u.last_name, u.email, u.avatar_url, u.created_at as user_created_at
      FROM profiles p
      JOIN users u ON p.user_id = u.id
      WHERE u.is_active = true AND u.role = 'player'
    `;
    const params = [];

    if (skills) {
      sql += ' AND JSON_CONTAINS(p.skills, ?)';
      params.push(JSON.stringify(skills.split(',')));
    }

    if (positions) {
      sql += ' AND JSON_CONTAINS(p.positions, ?)';
      params.push(JSON.stringify(positions.split(',')));
    }

    if (location) {
      sql += ' AND p.location LIKE ?';
      params.push(`%${location}%`);
    }

    if (min_rate) {
      sql += ' AND p.hourly_rate >= ?';
      params.push(parseFloat(min_rate));
    }

    if (max_rate) {
      sql += ' AND p.hourly_rate <= ?';
      params.push(parseFloat(max_rate));
    }

    sql += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit));
    params.push(offset);

    const players = await query(sql, params);

    // Get total count for pagination
    let countSql = `
      SELECT COUNT(*) as total
      FROM profiles p
      JOIN users u ON p.user_id = u.id
      WHERE u.is_active = true AND u.role = 'player'
    `;
    const countParams = [];

    if (skills) {
      countSql += ' AND JSON_CONTAINS(p.skills, ?)';
      countParams.push(JSON.stringify(skills.split(',')));
    }

    if (positions) {
      countSql += ' AND JSON_CONTAINS(p.positions, ?)';
      countParams.push(JSON.stringify(positions.split(',')));
    }

    if (location) {
      countSql += ' AND p.location LIKE ?';
      countParams.push(`%${location}%`);
    }

    if (min_rate) {
      countSql += ' AND p.hourly_rate >= ?';
      countParams.push(parseFloat(min_rate));
    }

    if (max_rate) {
      countSql += ' AND p.hourly_rate <= ?';
      countParams.push(parseFloat(max_rate));
    }

    const countResult = await query(countSql, countParams);
    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    res.json({
      players,
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
    console.error('Get players error:', error);
    res.status(500).json({ error: 'Failed to get players' });
  }
});

// Get coaches with filters (public endpoint)
router.get('/coaches', async (req, res) => {
  try {
    const {
      skills,
      positions,
      min_rate,
      max_rate,
      location,
      page = 1,
      limit = 20
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    let sql = `
      SELECT p.*, u.first_name, u.last_name, u.email, u.avatar_url, u.created_at as user_created_at
      FROM profiles p
      JOIN users u ON p.user_id = u.id
      WHERE u.is_active = true AND u.role = 'coach'
    `;
    const params = [];

    if (skills) {
      sql += ' AND JSON_CONTAINS(p.skills, ?)';
      params.push(JSON.stringify(skills.split(',')));
    }

    if (positions) {
      sql += ' AND JSON_CONTAINS(p.positions, ?)';
      params.push(JSON.stringify(positions.split(',')));
    }

    if (location) {
      sql += ' AND p.location LIKE ?';
      params.push(`%${location}%`);
    }

    if (min_rate) {
      sql += ' AND p.hourly_rate >= ?';
      params.push(parseFloat(min_rate));
    }

    if (max_rate) {
      sql += ' AND p.hourly_rate <= ?';
      params.push(parseFloat(max_rate));
    }

    sql += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit));
    params.push(offset);

    const coaches = await query(sql, params);

    // Get total count for pagination
    let countSql = `
      SELECT COUNT(*) as total
      FROM profiles p
      JOIN users u ON p.user_id = u.id
      WHERE u.is_active = true AND u.role = 'coach'
    `;
    const countParams = [];

    if (skills) {
      countSql += ' AND JSON_CONTAINS(p.skills, ?)';
      countParams.push(JSON.stringify(skills.split(',')));
    }

    if (positions) {
      countSql += ' AND JSON_CONTAINS(p.positions, ?)';
      countParams.push(JSON.stringify(positions.split(',')));
    }

    if (location) {
      countSql += ' AND p.location LIKE ?';
      countParams.push(`%${location}%`);
    }

    if (min_rate) {
      countSql += ' AND p.hourly_rate >= ?';
      countParams.push(parseFloat(min_rate));
    }

    if (max_rate) {
      countSql += ' AND p.hourly_rate <= ?';
      countParams.push(parseFloat(max_rate));
    }

    const countResult = await query(countSql, countParams);
    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    res.json({
      coaches,
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
    console.error('Get coaches error:', error);
    res.status(500).json({ error: 'Failed to get coaches' });
  }
});

// Search profiles
router.get('/search',
  verifyToken,
  async (req, res) => {
    try {
      const {
        type,
        location,
        skills,
        min_experience,
        max_rate,
        min_rate,
        search,
        page = 1,
        limit = 20
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);

      let sql = `
        SELECT p.*, u.name, u.email, u.avatar_url, u.created_at as user_created_at
        FROM profiles p
        JOIN users u ON p.user_id = u.id
        WHERE u.is_active = true
      `;
      const params = [];

      if (type) {
        sql += ' AND p.type = ?';
        params.push(type);
      }

      if (location) {
        sql += ' AND p.location LIKE ?';
        params.push(`%${location}%`);
      }

      if (min_experience) {
        sql += ' AND p.years_experience >= ?';
        params.push(parseInt(min_experience));
      }

      if (min_rate) {
        sql += ' AND p.hourly_rate >= ?';
        params.push(parseFloat(min_rate));
      }

      if (max_rate) {
        sql += ' AND p.hourly_rate <= ?';
        params.push(parseFloat(max_rate));
      }

      if (search) {
        sql += ' AND (u.name LIKE ? OR p.bio LIKE ?)';
        params.push(`%${search}%`);
        params.push(`%${search}%`);
      }

      if (skills) {
        const skillsArray = Array.isArray(skills) ? skills : [skills];
        for (const skill of skillsArray) {
          sql += ' AND JSON_SEARCH(p.skills, "one", ?) IS NOT NULL';
          params.push(skill);
        }
      }

      sql += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit));
    params.push(offset);

      const profiles = await query(sql, params);

      res.json({ profiles });

    } catch (error) {
      console.error('Search profiles error:', error);
      res.status(500).json({ error: 'Failed to search profiles' });
    }
  }
);

// Delete profile
router.delete('/:id',
  verifyToken,
  validateId,
  requireOwnershipOrAdmin(async (req) => {
    const profiles = await query('SELECT user_id FROM profiles WHERE id = ?', [req.params.id]);
    return profiles.length > 0 ? profiles[0].user_id : null;
  }),
  autoAuditLog(AUDIT_ACTIONS.DELETE_PROFILE, 'profile'),
  async (req, res) => {
    try {
      const profileId = req.params.id;

      // Check if profile exists
      const profiles = await query(
        'SELECT id FROM profiles WHERE id = ?',
        [profileId]
      );

      if (profiles.length === 0) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      // Delete profile
      await query('DELETE FROM profiles WHERE id = ?', [profileId]);

      res.json({ message: 'Profile deleted successfully' });

    } catch (error) {
      console.error('Delete profile error:', error);
      res.status(500).json({ error: 'Failed to delete profile' });
    }
  }
);

module.exports = router;
