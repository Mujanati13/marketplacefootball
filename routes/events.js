const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { verifyToken, requireRole } = require('../middleware/auth');
const { validatePagination } = require('../middleware/validation');
const { autoAuditLog, AUDIT_ACTIONS } = require('../middleware/audit');

// Get all active future events (for players, coaches, and clubs)
router.get('/', 
  verifyToken,
  validatePagination,
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;
      const eventType = req.query.type; // Optional filter by event type

      let whereClause = 'WHERE e.is_active = true AND e.event_date >= NOW()';
      let queryParams = [];

      if (eventType && ['match', 'training', 'meeting', 'tournament', 'announcement'].includes(eventType)) {
        whereClause += ' AND e.event_type = ?';
        queryParams.push(eventType);
      }

      // Add pagination parameters
      queryParams.push(limit, offset);

      const events = await query(`
        SELECT 
          e.id,
          e.title,
          e.description,
          e.event_date,
          e.location,
          e.event_type,
          e.image_url,
          e.created_at,
          u.first_name as creator_first_name,
          u.last_name as creator_last_name,
          u.role as creator_role
        FROM events e
        JOIN users u ON e.created_by = u.id
        ${whereClause}
        ORDER BY e.event_date ASC
        LIMIT ? OFFSET ?
      `, queryParams);

      // Get total count for pagination
      let countParams = [];
      if (eventType && ['match', 'training', 'meeting', 'tournament', 'announcement'].includes(eventType)) {
        countParams.push(eventType);
      }

      const countResult = await query(`
        SELECT COUNT(*) as total
        FROM events e
        WHERE e.is_active = true AND e.event_date >= NOW()
        ${eventType ? 'AND e.event_type = ?' : ''}
      `, countParams);

      const total = countResult[0].total;
      const totalPages = Math.ceil(total / limit);

      res.json({
        events,
        pagination: {
          current_page: page,
          total_pages: totalPages,
          total_items: total,
          items_per_page: limit,
          has_next: page < totalPages,
          has_prev: page > 1
        }
      });

    } catch (error) {
      console.error('Get events error:', error);
      res.status(500).json({ error: 'Failed to get events' });
    }
  }
);

// Get event by ID
router.get('/:id',
  verifyToken,
  async (req, res) => {
    try {
      const eventId = req.params.id;

      const events = await query(`
        SELECT 
          e.id,
          e.title,
          e.description,
          e.event_date,
          e.location,
          e.event_type,
          e.image_url,
          e.created_at,
          e.updated_at,
          u.first_name as creator_first_name,
          u.last_name as creator_last_name,
          u.role as creator_role,
          u.email as creator_email
        FROM events e
        JOIN users u ON e.created_by = u.id
        WHERE e.id = ? AND e.is_active = true
      `, [eventId]);

      if (events.length === 0) {
        return res.status(404).json({ error: 'Event not found' });
      }

      res.json(events[0]);

    } catch (error) {
      console.error('Get event error:', error);
      res.status(500).json({ error: 'Failed to get event' });
    }
  }
);

// Create new event (admin only)
router.post('/',
  verifyToken,
  requireRole(['admin']),
  autoAuditLog(AUDIT_ACTIONS.CREATE_EVENT, 'event'),
  async (req, res) => {
    try {
      const { title, description, event_date, location, event_type = 'announcement', image_url } = req.body;
      const userId = req.user.id;

      // Validate required fields
      if (!title || !event_date) {
        return res.status(400).json({ error: 'Title and event date are required' });
      }

      // Validate event_type
      if (!['match', 'training', 'meeting', 'tournament', 'announcement'].includes(event_type)) {
        return res.status(400).json({ error: 'Invalid event type' });
      }

      // Validate event date is in the future
      const eventDate = new Date(event_date);
      if (eventDate <= new Date()) {
        return res.status(400).json({ error: 'Event date must be in the future' });
      }

      const result = await query(`
        INSERT INTO events (title, description, event_date, location, event_type, created_by, image_url)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [title, description, event_date, location, event_type, userId, image_url]);

      // Get the created event
      const events = await query(`
        SELECT 
          e.id,
          e.title,
          e.description,
          e.event_date,
          e.location,
          e.event_type,
          e.image_url,
          e.created_at,
          u.first_name as creator_first_name,
          u.last_name as creator_last_name
        FROM events e
        JOIN users u ON e.created_by = u.id
        WHERE e.id = ?
      `, [result.insertId]);

      res.status(201).json(events[0]);

    } catch (error) {
      console.error('Create event error:', error);
      res.status(500).json({ error: 'Failed to create event' });
    }
  }
);

// Update event (admin only)
router.put('/:id',
  verifyToken,
  requireRole(['admin']),
  autoAuditLog(AUDIT_ACTIONS.UPDATE_EVENT, 'event'),
  async (req, res) => {
    try {
      const eventId = req.params.id;
      const { title, description, event_date, location, event_type, image_url, is_active } = req.body;

      // Check if event exists
      const existingEvent = await query('SELECT id FROM events WHERE id = ?', [eventId]);
      if (existingEvent.length === 0) {
        return res.status(404).json({ error: 'Event not found' });
      }

      // Validate event_type if provided
      if (event_type && !['match', 'training', 'meeting', 'tournament', 'announcement'].includes(event_type)) {
        return res.status(400).json({ error: 'Invalid event type' });
      }

      // Validate event date is in the future if provided
      if (event_date) {
        const eventDate = new Date(event_date);
        if (eventDate <= new Date()) {
          return res.status(400).json({ error: 'Event date must be in the future' });
        }
      }

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
      if (event_date !== undefined) {
        updateFields.push('event_date = ?');
        updateValues.push(event_date);
      }
      if (location !== undefined) {
        updateFields.push('location = ?');
        updateValues.push(location);
      }
      if (event_type !== undefined) {
        updateFields.push('event_type = ?');
        updateValues.push(event_type);
      }
      if (image_url !== undefined) {
        updateFields.push('image_url = ?');
        updateValues.push(image_url);
      }
      if (is_active !== undefined) {
        updateFields.push('is_active = ?');
        updateValues.push(is_active);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      updateFields.push('updated_at = NOW()');
      updateValues.push(eventId);

      await query(`
        UPDATE events 
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `, updateValues);

      // Get updated event
      const events = await query(`
        SELECT 
          e.id,
          e.title,
          e.description,
          e.event_date,
          e.location,
          e.event_type,
          e.image_url,
          e.is_active,
          e.created_at,
          e.updated_at,
          u.first_name as creator_first_name,
          u.last_name as creator_last_name
        FROM events e
        JOIN users u ON e.created_by = u.id
        WHERE e.id = ?
      `, [eventId]);

      res.json(events[0]);

    } catch (error) {
      console.error('Update event error:', error);
      res.status(500).json({ error: 'Failed to update event' });
    }
  }
);

// Delete event (admin only)
router.delete('/:id',
  verifyToken,
  requireRole(['admin']),
  autoAuditLog(AUDIT_ACTIONS.DELETE_EVENT, 'event'),
  async (req, res) => {
    try {
      const eventId = req.params.id;

      // Check if event exists
      const existingEvent = await query('SELECT id FROM events WHERE id = ?', [eventId]);
      if (existingEvent.length === 0) {
        return res.status(404).json({ error: 'Event not found' });
      }

      // Soft delete (set is_active to false)
      await query('UPDATE events SET is_active = false WHERE id = ?', [eventId]);

      res.json({ message: 'Event deleted successfully' });

    } catch (error) {
      console.error('Delete event error:', error);
      res.status(500).json({ error: 'Failed to delete event' });
    }
  }
);

// Get events stats (admin only)
router.get('/admin/stats',
  verifyToken,
  requireRole(['admin']),
  async (req, res) => {
    try {
      const stats = await query(`
        SELECT 
          event_type,
          COUNT(*) as count,
          COUNT(CASE WHEN event_date >= NOW() THEN 1 END) as upcoming,
          COUNT(CASE WHEN event_date < NOW() THEN 1 END) as past
        FROM events 
        WHERE is_active = true
        GROUP BY event_type
      `);

      const totalStats = await query(`
        SELECT 
          COUNT(*) as total_events,
          COUNT(CASE WHEN event_date >= NOW() THEN 1 END) as total_upcoming,
          COUNT(CASE WHEN event_date < NOW() THEN 1 END) as total_past,
          COUNT(CASE WHEN is_active = true THEN 1 END) as total_active
        FROM events
      `);

      res.json({
        by_type: stats,
        total: totalStats[0]
      });

    } catch (error) {
      console.error('Get events stats error:', error);
      res.status(500).json({ error: 'Failed to get events stats' });
    }
  }
);

module.exports = router;