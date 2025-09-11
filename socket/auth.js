const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// Socket.IO authentication middleware
const socketAuth = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get user from database
    const users = await query(
      'SELECT id, email, role, is_active FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (users.length === 0) {
      return next(new Error('User not found'));
    }

    const user = users[0];
    if (!user.is_active) {
      return next(new Error('Account deactivated'));
    }

    // Attach user info to socket
    socket.userId = user.id;
    socket.userRole = user.role;
    socket.userEmail = user.email;

    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    if (error.name === 'TokenExpiredError') {
      return next(new Error('Token expired'));
    }
    return next(new Error('Invalid token'));
  }
};

module.exports = socketAuth;
