const { body, param, query, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// User validation rules
const validateUserRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  body('name')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Name must be between 2 and 255 characters'),
  body('role')
    .optional()
    .isIn(['player', 'coach', 'club_representative'])
    .withMessage('Role must be player, coach, or club_representative'),
  handleValidationErrors
];

const validateUserLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

const validateUserUpdate = [
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Name must be between 2 and 255 characters'),
  body('phone')
    .optional()
    .matches(/^\+?[\d\s\-\(\)]+$/)
    .withMessage('Invalid phone number format'),
  handleValidationErrors
];

// Profile validation rules
const validateProfile = [
  body('type')
    .isIn(['player', 'coach'])
    .withMessage('Type must be player or coach'),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Bio must not exceed 1000 characters'),
  body('location')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Location must not exceed 255 characters'),
  body('years_experience')
    .optional()
    .isInt({ min: 0, max: 50 })
    .withMessage('Years of experience must be between 0 and 50'),
  body('hourly_rate')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Hourly rate must be a positive number'),
  body('currency')
    .optional()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-letter code'),
  body('positions')
    .optional()
    .isArray()
    .withMessage('Positions must be an array'),
  body('skills')
    .optional()
    .isArray()
    .withMessage('Skills must be an array'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  handleValidationErrors
];

// Listing validation rules
const validateListing = [
  body('type')
    .isIn(['player', 'coach'])
    .withMessage('Type must be player or coach'),
  body('title')
    .trim()
    .isLength({ min: 5, max: 255 })
    .withMessage('Title must be between 5 and 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description must not exceed 2000 characters'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('currency')
    .optional()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-letter code'),
  handleValidationErrors
];

// Request validation rules
const validateRequest = [
  body('target_user_id')
    .isInt({ min: 1 })
    .withMessage('Valid target user ID is required'),
  body('listing_id')
    .isInt({ min: 1 })
    .withMessage('Valid listing ID is required'),
  body('type')
    .isIn(['buy', 'hire'])
    .withMessage('Type must be buy or hire'),
  body('message')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Message must not exceed 1000 characters'),
  handleValidationErrors
];

// Meeting validation rules
const validateMeeting = [
  body('request_id')
    .isInt({ min: 1 })
    .withMessage('Valid request ID is required'),
  body('coach_user_id')
    .isInt({ min: 1 })
    .withMessage('Valid coach user ID is required'),
  body('player_user_id')
    .isInt({ min: 1 })
    .withMessage('Valid player user ID is required'),
  body('start_at')
    .isISO8601()
    .withMessage('Valid start date/time is required'),
  body('end_at')
    .isISO8601()
    .withMessage('Valid end date/time is required'),
  body('location_uri')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Location URI must not exceed 500 characters'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes must not exceed 1000 characters'),
  handleValidationErrors
];

// Message validation rules
const validateMessage = [
  body('body')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Message body must be between 1 and 2000 characters'),
  body('attachments')
    .optional()
    .isArray()
    .withMessage('Attachments must be an array'),
  handleValidationErrors
];

// ID parameter validation
const validateId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid ID is required'),
  handleValidationErrors
];

// Query parameter validation
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateUserRegistration,
  validateUserLogin,
  validateUserUpdate,
  validateProfile,
  validateListing,
  validateRequest,
  validateMeeting,
  validateMessage,
  validateId,
  validatePagination
};
