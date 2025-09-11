const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// Generate access token
const generateAccessToken = (user) => {
  return jwt.sign(
    { 
      userId: user.id, 
      email: user.email, 
      role: user.role 
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

// Generate refresh token
const generateRefreshToken = (user) => {
  return jwt.sign(
    { userId: user.id },
    JWT_REFRESH_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN }
  );
};

// Hash password
const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

// Compare password
const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

// Verify token middleware
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1]; // Bearer <token>
    if (!token) {
      return res.status(401).json({ error: 'Invalid token format' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get user from database to ensure they still exist and are active
    const users = await query(
      'SELECT id, email, role, status FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = users[0];
    if (user.status !== 'active') {
      return res.status(401).json({ error: 'Account deactivated' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Role-based access control
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

// Check if user owns resource or is admin
const requireOwnershipOrAdmin = (getUserIdFromParams) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Admin can access everything
      if (req.user.role === 'admin') {
        return next();
      }

      // Get the owner ID from the request parameters
      const ownerId = await getUserIdFromParams(req);
      
      if (ownerId !== req.user.id) {
        return res.status(403).json({ error: 'You can only access your own resources' });
      }

      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      return res.status(500).json({ error: 'Authorization check failed' });
    }
  };
};

// Verify refresh token
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET);
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  hashPassword,
  comparePassword,
  verifyToken,
  requireRole,
  requireOwnershipOrAdmin,
  verifyRefreshToken
};
