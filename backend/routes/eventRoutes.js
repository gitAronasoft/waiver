const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const eventController = require('../controllers/eventController');
const { authenticateToken } = require('../middleware/auth');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../public/uploads/events');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('✅ Created events upload directory:', uploadDir);
}

// Configure multer for event image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/\s+/g, '_');
    cb(null, `${timestamp}_${safeName}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Public route - get public events with recurrences
router.get('/public', eventController.getPublicEvents);

// Protected admin routes - authentication required
router.use(authenticateToken);

// Admin routes - get all events
router.get('/', eventController.getAllEvents);

// Create event with image upload
router.post('/', upload.single('image'), eventController.createEvent);

// Update event with optional image upload
router.put('/:id', upload.single('image'), eventController.updateEvent);

// Delete event
router.delete('/:id', eventController.deleteEvent);

module.exports = router;
