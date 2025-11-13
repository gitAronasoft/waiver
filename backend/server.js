const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const db = require('./config/database');
const waiverRoutes = require('./routes/waiverRoutes');
const authRoutes = require('./routes/authRoutes');
const staffRoutes = require('./routes/staffRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const ratingRoutes = require('./routes/ratingRoutes');
const eventRoutes = require('./routes/eventRoutes');
const { initializeEventsTable } = require('./controllers/eventController');

// Initialize rating email/SMS scheduler
require('./ratingEmailScheduler');

const app = express();

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

const PORT = process.env.PORT || 8080;

// CORS configuration - allows all origins for development
// For production, restrict to specific domains
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Body parser with size limits to prevent large payload attacks
app.use(bodyParser.json({ 
  limit: '50mb',
  verify: (req, res, buf) => {
    // Store raw body for signature verification if needed
    req.rawBody = buf.toString('utf8');
  }
}));
app.use(bodyParser.urlencoded({ 
  limit: '50mb', 
  extended: true 
}));

// Request logging middleware (only in development or when needed)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
    });
    next();
  });
}

// API Routes
app.use('/api/waivers', waiverRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/rating', ratingRoutes);
app.use('/api/events', eventRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Database health check endpoint
app.get('/api/test-db', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT 1 as test');
    res.json({ 
      status: 'ok', 
      message: 'Database connected', 
      data: rows 
    });
  } catch (error) {
    const errorId = `ERR_${Date.now()}`;
    console.error(`[${errorId}] Database connection test failed:`, error.message);

    res.status(500).json({ 
      status: 'error', 
      error: 'Database connection failed',
      errorId
    });
  }
});

// 404 handler for undefined routes
app.use((req, res, next) => {
  if (!req.route) {
    return res.status(404).json({ 
      error: 'Route not found',
      path: req.path,
      method: req.method
    });
  }
  next();
});

// Global error handling middleware
// Must be defined after all routes and middleware
app.use((err, req, res, next) => {
  const errorId = `ERR_${Date.now()}`;

  // Log error details for debugging
  console.error(`[${errorId}] Server Error:`, {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body
  });

  // Determine status code
  const statusCode = err.status || err.statusCode || 500;

  // Send sanitized error response to client
  res.status(statusCode).json({
    error: err.message || 'Internal server error',
    errorId,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Graceful shutdown handler
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Closing server gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Initialize events table before starting server
initializeEventsTable().then(() => {
  // Start server
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`⏰ Started at: ${new Date().toISOString()}`);
  });
}).catch(err => {
  console.error('Failed to initialize events table:', err);
  process.exit(1);
});