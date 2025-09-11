const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { query } = require('../config/database');

// Specific rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs for auth
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const strictAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Even stricter for login attempts
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
const { 
  generateAccessToken, 
  generateRefreshToken, 
  hashPassword, 
  comparePassword,
  verifyRefreshToken,
  verifyToken
} = require('../middleware/auth');
const { 
  validateUserRegistration, 
  validateUserLogin 
} = require('../middleware/validation');
const { autoAuditLog, AUDIT_ACTIONS } = require('../middleware/audit');

// Register new user
router.post('/register', 
  authLimiter,
  validateUserRegistration,
  autoAuditLog(AUDIT_ACTIONS.REGISTER, 'user'),
  async (req, res) => {
    try {
      const { email, password, name, role = 'player' } = req.body;

      // Check if user already exists
      const existingUsers = await query(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );

      if (existingUsers.length > 0) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Create user
      const result = await query(
        `INSERT INTO users (email, password_hash, name, role) 
         VALUES (?, ?, ?, ?)`,
        [email, passwordHash, name, role]
      );

      console.log('User created with ID:', result.insertId);
      const userId = result.insertId;

      // Get created user (without password)
      const users = await query(
        'SELECT id, email, name, role, is_active, created_at FROM users WHERE id = ?',
        [userId]
      );

      const user = users[0];

      // Generate tokens
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      res.status(201).json({
        message: 'User registered successfully',
        user,
        accessToken,
        refreshToken
      });

    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
);

// Login user
router.post('/login',
  // strictAuthLimiter, // Temporarily disable for testing
  validateUserLogin,
  autoAuditLog(AUDIT_ACTIONS.LOGIN, 'user'),
  async (req, res) => {
    try {
      const { email, password } = req.body;

      // Get user with password
      const users = await query(
        'SELECT * FROM users WHERE email = ? AND status = ?',
        [email, 'active']
      );

      if (users.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = users[0];

      // Verify password
      const isValidPassword = await comparePassword(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Remove password from user object
      delete user.password_hash;

      // Generate tokens
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      res.json({
        message: 'Login successful',
        user,
        accessToken,
        refreshToken
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

// Refresh token
router.post('/refresh',
  autoAuditLog(AUDIT_ACTIONS.REFRESH_TOKEN, 'user'),
  async (req, res) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(401).json({ error: 'Refresh token required' });
      }

      // Verify refresh token
      const decoded = verifyRefreshToken(refreshToken);

      // Get user
      const users = await query(
        'SELECT id, email, name, role, phone, avatar_url, is_active FROM users WHERE id = ? AND is_active = true',
        [decoded.userId]
      );

      if (users.length === 0) {
        return res.status(401).json({ error: 'User not found' });
      }

      const user = users[0];

      // Generate new tokens
      const newAccessToken = generateAccessToken(user);
      const newRefreshToken = generateRefreshToken(user);

      res.json({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        user
      });

    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(401).json({ error: 'Invalid refresh token' });
    }
  }
);

// Get current user profile
router.get('/me', verifyToken, async (req, res) => {
  try {
    const users = await query(
      'SELECT id, email, role, status, created_at, updated_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: users[0] });

  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
});

// Logout (client-side token removal, optionally blacklist token)
router.post('/logout',
  verifyToken,
  autoAuditLog(AUDIT_ACTIONS.LOGOUT, 'user'),
  async (req, res) => {
    try {
      // In a production app, you might want to blacklist the token
      // For now, we just return success as the client will remove the token
      
      res.json({ message: 'Logout successful' });

    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Logout failed' });
    }
  }
);

// Change password
router.post('/change-password', verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long' });
    }

    // Get user with current password
    const users = await query(
      'SELECT password_hash FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];

    // Verify current password
    const isValidPassword = await comparePassword(currentPassword, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    await query(
      'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newPasswordHash, req.user.id]
    );

    res.json({ message: 'Password changed successfully' });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

module.exports = router;
