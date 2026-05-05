require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo').default;
const mongoose = require('mongoose');
require('./db'); // Connect to MongoDB

const app = express();
const PORT = process.env.PORT || 8000;

// Trust proxy - Important for production environments like Render
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware with MongoDB store
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'jc-rentals-secret-key-change-in-production',
  resave: false,
  saveUninitialized: true,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/jcrentals',
    touchAfter: 24 * 3600 // Lazy session update (24 hours)
  }),
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
};

app.use(session(sessionConfig));

const baseSiteUrl = process.env.SITE_URL || process.env.BASE_URL || 'https://rentals.jcgroups.ca';

// Make request data available in all EJS views
app.use((req, res, next) => {
  res.locals.req = req;
  res.locals.currentPath = req.path;
  let canonicalUrl = `${baseSiteUrl}${req.path === '/' ? '' : req.path}`;
  if (canonicalUrl.endsWith('/') && canonicalUrl !== `${baseSiteUrl}/`) {
    canonicalUrl = canonicalUrl.slice(0, -1);
  }
  res.locals.canonicalUrl = canonicalUrl;
  next();
});

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Helper for dynamic domain generation
const getBaseUrl = (req) => {
  const protocol = req.protocol;
  const host = req.get('host');
  return `${protocol}://${host}`;
};

const createSlug = (text) => {
  return text
    ? text.toString().toLowerCase().trim()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
    : '';
};

app.get('/robots.txt', (req, res) => {
  const baseUrl = getBaseUrl(req);
  res.type('text/plain');
  res.send(`User-agent: *\nDisallow: /admin/\nAllow: /\nSitemap: ${baseUrl}/sitemap.xml\n`);
});

app.get('/sitemap.xml', async (req, res) => {
  const baseUrl = getBaseUrl(req);
  const { Equipment } = require('./db');
  const equipment = await Equipment.findAll();
  const equipmentUrls = (equipment || []).map(item => `${baseUrl}/equipment/${createSlug(item.name)}`);
  const urls = [
    `${baseUrl}/`,
    `${baseUrl}/equipment`,
    `${baseUrl}/contact`,
    `${baseUrl}/about`,
    `${baseUrl}/faq`,
    ...equipmentUrls
  ];

  res.type('application/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(url => `  <url><loc>${url}</loc></url>`).join('\n')}\n</urlset>`);
});

// Routes
const indexRoutes = require('./routes/index');
const adminRoutes = require('./routes/admin');

app.use('/', indexRoutes);
app.use('/admin', adminRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
