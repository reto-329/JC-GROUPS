require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const helmet = require('helmet');
const MongoStore = require('connect-mongo').default;
require('./db'); // Connect to MongoDB

const app = express();
const PORT = process.env.PORT || 4000;

// Security Middleware
app.use(helmet()); // Add security headers
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware with inactivity timeout
const SESSION_TIMEOUT = parseInt(process.env.SESSION_TIMEOUT_MINUTES || '20') * 60 * 1000; // Default 20 minutes
const WARNING_TIME = parseInt(process.env.SESSION_WARNING_MINUTES || '2') * 60 * 1000; // Warning 2 minutes before timeout

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/jcrentals';

app.use(session({
  secret: process.env.SESSION_SECRET || 'jc-rentals-secret-key-change-in-production',
  resave: false,
  saveUninitialized: true,
  store: new MongoStore({
    mongoUrl: MONGODB_URI,
    touchAfter: 24 * 3600, // Lazy session update (update every 24 hours if inactive)
    ttl: 24 * 60 * 60, // Auto-delete sessions after 24 hours from MongoDB
    autoRemove: 'interval', // Periodically remove expired sessions
    autoRemoveInterval: 10 // Check for expired sessions every 10 minutes
  }),
  cookie: { 
    secure: true, // Always true on Render (uses HTTPS)
    httpOnly: true, // Prevent XSS attacks
    sameSite: 'lax', // Allow cross-site cookie submission for form posts
    maxAge: 24 * 60 * 60 * 1000 // 24 hours (hard max)
  }
}));

// Session activity tracking middleware
app.use((req, res, next) => {
  if (req.session.userId) {
    const now = Date.now();
    const lastActivity = req.session.lastActivity || now;
    const inactiveTime = now - lastActivity;

    // Check if user is inactive beyond timeout
    if (inactiveTime > SESSION_TIMEOUT) {
      req.session.destroy((err) => {
        if (!err) {
          res.status(401).json({ 
            message: 'Session expired due to inactivity',
            expired: true 
          });
          return;
        }
        next();
      });
    } else {
      // Update last activity timestamp
      req.session.lastActivity = now;
    }
  }
  next();
});

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
const indexRoutes = require('./routes/index');
const adminRoutes = require('./routes/admin');

app.use('/', indexRoutes);
app.use('/admin', adminRoutes);

// API endpoints for session management
// Check session status and timeout info
app.get('/api/session/status', (req, res) => {
  if (!req.session.userId) {
    return res.json({ 
      authenticated: false,
      timeoutMinutes: parseInt(process.env.SESSION_TIMEOUT_MINUTES || '20'),
      warningMinutes: parseInt(process.env.SESSION_WARNING_MINUTES || '2')
    });
  }

  const now = Date.now();
  const lastActivity = req.session.lastActivity || now;
  const inactiveTime = now - lastActivity;
  const remainingTime = Math.max(0, SESSION_TIMEOUT - inactiveTime);

  res.json({
    authenticated: true,
    userId: req.session.userId,
    userName: req.session.userName,
    inactiveTimeMs: inactiveTime,
    remainingTimeMs: remainingTime,
    timeoutMinutes: parseInt(process.env.SESSION_TIMEOUT_MINUTES || '20'),
    warningMinutes: parseInt(process.env.SESSION_WARNING_MINUTES || '2'),
    sessionWarningThresholdMs: WARNING_TIME
  });
});

// Extend session by updating activity
app.post('/api/session/extend', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  req.session.lastActivity = Date.now();
  res.json({ 
    message: 'Session extended',
    newRemainingTimeMs: SESSION_TIMEOUT
  });
});

// 404 Error Handler - Handle undefined routes
app.use((req, res) => {
  res.status(404).render('error', { 
    title: 'Page Not Found',
    statusCode: 404,
    message: 'The page you are looking for does not exist.',
    isLoggedIn: !!req.session.userId
  }, (err) => {
    if (err) {
      res.status(404).json({ 
        statusCode: 404, 
        message: 'The page you are looking for does not exist.' 
      });
    }
  });
});

// Global Error Handler - Catch all errors
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'An error occurred. Please try again later.' 
    : err.message;

  console.error('ERROR:', {
    statusCode,
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method
  });

  res.status(statusCode).render('error', { 
    title: 'Error',
    statusCode,
    message,
    isLoggedIn: !!req.session.userId
  }, (renderErr) => {
    if (renderErr) {
      res.status(statusCode).json({ 
        statusCode, 
        message 
      });
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
