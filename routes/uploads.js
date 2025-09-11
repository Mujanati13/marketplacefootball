const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { verifyToken } = require('../middleware/auth');
const { autoAuditLog, AUDIT_ACTIONS } = require('../middleware/audit');

// Create uploads directory if it doesn't exist
const uploadsDir = process.env.UPLOAD_DIR || 'uploads';
const profilesDir = path.join(uploadsDir, 'profiles');
const listingsDir = path.join(uploadsDir, 'listings');
const messagesDir = path.join(uploadsDir, 'messages');

[uploadsDir, profilesDir, listingsDir, messagesDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadType = req.params.type || 'general';
    let destDir = uploadsDir;
    
    switch (uploadType) {
      case 'profile':
        destDir = profilesDir;
        break;
      case 'listing':
        destDir = listingsDir;
        break;
      case 'message':
        destDir = messagesDir;
        break;
      default:
        destDir = uploadsDir;
    }
    
    cb(null, destDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// File filter for security
const fileFilter = (req, file, cb) => {
  const allowedTypes = {
    image: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    video: ['.mp4', '.webm', '.ogg'],
    document: ['.pdf', '.doc', '.docx', '.txt']
  };

  const ext = path.extname(file.originalname).toLowerCase();
  const uploadType = req.params.type || 'general';

  let isAllowed = false;

  if (uploadType === 'profile' || uploadType === 'listing') {
    // Only images for profiles and listings
    isAllowed = allowedTypes.image.includes(ext);
  } else if (uploadType === 'message') {
    // Images and documents for messages
    isAllowed = allowedTypes.image.includes(ext) || allowedTypes.document.includes(ext);
  } else {
    // General upload - all types
    isAllowed = Object.values(allowedTypes).flat().includes(ext);
  }

  if (isAllowed) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${ext} is not allowed for ${uploadType} uploads`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
    files: 5 // Maximum 5 files per request
  }
});

// Upload single file
router.post('/single/:type',
  verifyToken,
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File too large' });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({ error: 'Too many files' });
        }
        return res.status(400).json({ error: err.message });
      } else if (err) {
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  },
  autoAuditLog(AUDIT_ACTIONS.UPLOAD_FILE, 'file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const uploadType = req.params.type;
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const filePath = req.file.path.replace(/\\/g, '/'); // Normalize path separators
      const relativePath = filePath.replace(uploadsDir.replace(/\\/g, '/'), '').replace(/^\//, '');
      const fileUrl = `${baseUrl}/uploads/${relativePath}`;

      const fileInfo = {
        id: uuidv4(),
        original_name: req.file.originalname,
        filename: req.file.filename,
        url: fileUrl,
        path: relativePath,
        type: uploadType,
        mime_type: req.file.mimetype,
        size: req.file.size,
        uploaded_by: req.user.id,
        uploaded_at: new Date().toISOString()
      };

      res.json({
        message: 'File uploaded successfully',
        file: fileInfo
      });

    } catch (error) {
      console.error('Single upload error:', error);
      res.status(500).json({ error: 'Failed to upload file' });
    }
  }
);

// Upload multiple files
router.post('/multiple/:type',
  verifyToken,
  (req, res, next) => {
    upload.array('files', 5)(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'One or more files are too large' });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({ error: 'Too many files (maximum 5)' });
        }
        return res.status(400).json({ error: err.message });
      } else if (err) {
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  },
  autoAuditLog(AUDIT_ACTIONS.UPLOAD_FILE, 'file'),
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      const uploadType = req.params.type;
      const baseUrl = `${req.protocol}://${req.get('host')}`;

      const fileInfos = req.files.map(file => {
        const filePath = file.path.replace(/\\/g, '/'); // Normalize path separators
        const relativePath = filePath.replace(uploadsDir.replace(/\\/g, '/'), '').replace(/^\//, '');
        const fileUrl = `${baseUrl}/uploads/${relativePath}`;

        return {
          id: uuidv4(),
          original_name: file.originalname,
          filename: file.filename,
          url: fileUrl,
          path: relativePath,
          type: uploadType,
          mime_type: file.mimetype,
          size: file.size,
          uploaded_by: req.user.id,
          uploaded_at: new Date().toISOString()
        };
      });

      res.json({
        message: 'Files uploaded successfully',
        files: fileInfos
      });

    } catch (error) {
      console.error('Multiple upload error:', error);
      res.status(500).json({ error: 'Failed to upload files' });
    }
  }
);

// Delete file
router.delete('/:filename',
  verifyToken,
  autoAuditLog(AUDIT_ACTIONS.DELETE_FILE, 'file'),
  async (req, res) => {
    try {
      const filename = req.params.filename;
      
      // Find file in all possible directories
      const possiblePaths = [
        path.join(uploadsDir, filename),
        path.join(profilesDir, filename),
        path.join(listingsDir, filename),
        path.join(messagesDir, filename)
      ];

      let filePath = null;
      for (const possiblePath of possiblePaths) {
        if (fs.existsSync(possiblePath)) {
          filePath = possiblePath;
          break;
        }
      }

      if (!filePath) {
        return res.status(404).json({ error: 'File not found' });
      }

      // Check if user owns the file (simplified check - in production you'd track file ownership)
      // For now, only admins can delete files, or implement proper ownership tracking
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'You do not have permission to delete this file' });
      }

      // Delete file
      fs.unlinkSync(filePath);

      res.json({ message: 'File deleted successfully' });

    } catch (error) {
      console.error('Delete file error:', error);
      res.status(500).json({ error: 'Failed to delete file' });
    }
  }
);

// Get file info
router.get('/info/:filename',
  verifyToken,
  async (req, res) => {
    try {
      const filename = req.params.filename;
      
      // Find file in all possible directories
      const possiblePaths = [
        { path: path.join(uploadsDir, filename), type: 'general' },
        { path: path.join(profilesDir, filename), type: 'profile' },
        { path: path.join(listingsDir, filename), type: 'listing' },
        { path: path.join(messagesDir, filename), type: 'message' }
      ];

      let fileInfo = null;
      for (const possible of possiblePaths) {
        if (fs.existsSync(possible.path)) {
          const stats = fs.statSync(possible.path);
          const baseUrl = `${req.protocol}://${req.get('host')}`;
          const relativePath = possible.path.replace(uploadsDir, '').replace(/\\/g, '/').replace(/^\//, '');
          
          fileInfo = {
            filename,
            type: possible.type,
            size: stats.size,
            created_at: stats.birthtime,
            modified_at: stats.mtime,
            url: `${baseUrl}/uploads/${relativePath}`
          };
          break;
        }
      }

      if (!fileInfo) {
        return res.status(404).json({ error: 'File not found' });
      }

      res.json({ file: fileInfo });

    } catch (error) {
      console.error('Get file info error:', error);
      res.status(500).json({ error: 'Failed to get file info' });
    }
  }
);

// Handle upload errors
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files' });
    }
    return res.status(400).json({ error: error.message });
  }
  
  if (error.message.includes('File type')) {
    return res.status(400).json({ error: error.message });
  }
  
  console.error('Upload error:', error);
  res.status(500).json({ error: 'Upload failed' });
});

module.exports = router;
