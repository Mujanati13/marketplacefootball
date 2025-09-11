const { query } = require('../config/database');

// Log user actions for audit trail
const auditLog = async (userId, action, tableName, recordId, oldValues = null, newValues = null, ipAddress = null, userAgent = null, description = null) => {
  try {
    await query(
      `INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values, ip_address, user_agent, description) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, action, tableName, recordId, JSON.stringify(oldValues), JSON.stringify(newValues), ipAddress, userAgent, description]
    );
  } catch (error) {
    console.error('Audit log error:', error);
    // Don't throw error to avoid breaking the main operation
  }
};

// Middleware to automatically log API actions
const autoAuditLog = (action, entity) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json;

    // Override json method to capture response
    res.json = function(data) {
      // Only log successful operations (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const userId = req.user ? req.user.id : null;
        const recordId = req.params.id || (data && data.id) || null;
        
        // Create audit data
        const newValues = action === 'LOGIN' ? { email: req.body.email } : req.body;
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.get('User-Agent');
        const description = `${req.method} ${req.path}`;

        // Log asynchronously without blocking response
        setImmediate(() => {
          auditLog(userId, action, entity, recordId, null, newValues, ipAddress, userAgent, description);
        });
      }

      // Call original json method
      return originalJson.call(this, data);
    };

    next();
  };
};

// Predefined audit actions
const AUDIT_ACTIONS = {
  // Auth actions
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  REGISTER: 'REGISTER',
  REFRESH_TOKEN: 'REFRESH_TOKEN',
  
  // User actions
  CREATE_USER: 'CREATE_USER',
  UPDATE_USER: 'UPDATE_USER',
  DELETE_USER: 'DELETE_USER',
  DEACTIVATE_USER: 'DEACTIVATE_USER',
  
  // Profile actions
  CREATE_PROFILE: 'CREATE_PROFILE',
  UPDATE_PROFILE: 'UPDATE_PROFILE',
  DELETE_PROFILE: 'DELETE_PROFILE',
  
  // Listing actions
  CREATE_LISTING: 'CREATE_LISTING',
  UPDATE_LISTING: 'UPDATE_LISTING',
  DELETE_LISTING: 'DELETE_LISTING',
  PAUSE_LISTING: 'PAUSE_LISTING',
  ACTIVATE_LISTING: 'ACTIVATE_LISTING',
  
  // Request actions
  CREATE_REQUEST: 'CREATE_REQUEST',
  UPDATE_REQUEST_STATUS: 'UPDATE_REQUEST_STATUS',
  CANCEL_REQUEST: 'CANCEL_REQUEST',
  
  // Meeting actions
  CREATE_MEETING: 'CREATE_MEETING',
  UPDATE_MEETING: 'UPDATE_MEETING',
  CANCEL_MEETING: 'CANCEL_MEETING',
  COMPLETE_MEETING: 'COMPLETE_MEETING',
  
  // Chat actions
  CREATE_CONVERSATION: 'CREATE_CONVERSATION',
  SEND_MESSAGE: 'SEND_MESSAGE',
  JOIN_CONVERSATION: 'JOIN_CONVERSATION',
  LEAVE_CONVERSATION: 'LEAVE_CONVERSATION',
  
  // File actions
  UPLOAD_FILE: 'UPLOAD_FILE',
  DELETE_FILE: 'DELETE_FILE',
  
  // Admin actions
  ADMIN_LOGIN: 'ADMIN_LOGIN',
  ADMIN_MODERATE: 'ADMIN_MODERATE'
};

// Get audit logs with filtering
const getAuditLogs = async (filters = {}) => {
  let sql = `
    SELECT 
      al.*,
      u.name as actor_name,
      u.email as actor_email
    FROM audit_logs al
    LEFT JOIN users u ON al.actor_user_id = u.id
    WHERE 1=1
  `;
  
  const params = [];
  
  if (filters.actorUserId) {
    sql += ' AND al.actor_user_id = ?';
    params.push(filters.actorUserId);
  }
  
  if (filters.entity) {
    sql += ' AND al.entity = ?';
    params.push(filters.entity);
  }
  
  if (filters.entityId) {
    sql += ' AND al.entity_id = ?';
    params.push(filters.entityId);
  }
  
  if (filters.action) {
    sql += ' AND al.action = ?';
    params.push(filters.action);
  }
  
  if (filters.startDate) {
    sql += ' AND al.created_at >= ?';
    params.push(filters.startDate);
  }
  
  if (filters.endDate) {
    sql += ' AND al.created_at <= ?';
    params.push(filters.endDate);
  }
  
  sql += ' ORDER BY al.created_at DESC';
  
  if (filters.limit) {
    sql += ' LIMIT ?';
    params.push(parseInt(filters.limit));
  }
  
  if (filters.offset) {
    sql += ' OFFSET ?';
    params.push(parseInt(filters.offset));
  }
  
  return await query(sql, params);
};

module.exports = {
  auditLog,
  autoAuditLog,
  getAuditLogs,
  AUDIT_ACTIONS
};
