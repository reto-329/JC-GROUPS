const express = require('express');
const router = express.Router();
const AdminAuthController = require('../controllers/adminAuthController');
const AdminPagesController = require('../controllers/adminPagesController');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer for Cloudinary uploads
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => {
    const category = req.body.category || 'uncategorized';
    return {
      folder: `jc-rentals/equipment/${category}`,
      resource_type: 'auto',
      public_id: 'equipment-' + Date.now()
    };
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(file.originalname.split('.').pop().toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Middleware to check if admin is logged in
const requireAdminLogin = (req, res, next) => {
  if (req.session.adminId) {
    next();
  } else {
    res.redirect('/admin/login');
  }
};

// Middleware to validate category - only for new category values on add, optional on edit
const validateCategory = (req, res, next) => {
  const ALLOWED_CATEGORIES = ['Tools', 'Machinery', 'Vehicles', 'Safety', 'Other'];
  const category = req.body.category ? req.body.category.trim() : null;
  
  // For edits (PUT requests), category is optional - if not provided, keep existing
  // For adds (POST requests), category is required
  if (req.method === 'POST' && !category) {
    return res.status(400).json({ 
      success: false, 
      message: 'Category is required' 
    });
  }
  
  // If category is provided, validate it
  if (category && !ALLOWED_CATEGORIES.includes(category)) {
    return res.status(400).json({ 
      success: false, 
      message: `Invalid category. Allowed categories are: ${ALLOWED_CATEGORIES.join(', ')}` 
    });
  }
  
  // Category is valid or not provided on edit, proceed
  console.log('✓ Category validated:', category || '(not changed)');
  next();
};

// Middleware to pass admin data to templates
router.use((req, res, next) => {
  res.locals.isAdminLoggedIn = !!req.session.adminId;
  res.locals.adminId = req.session.adminId;
  res.locals.adminName = req.session.adminName || '';
  res.locals.adminRole = req.session.adminRole || '';
  next();
});

// Admin Authentication Routes
router.get('/login', AdminAuthController.getAdminLogin);
router.post('/login', AdminAuthController.postAdminLogin);
router.get('/logout', AdminAuthController.adminLogout);

// Protected Admin Routes
router.get('/dashboard', requireAdminLogin, AdminPagesController.getDashboard);
router.get('/users', requireAdminLogin, AdminPagesController.getUsers);
router.get('/equipment', requireAdminLogin, AdminPagesController.getEquipment);
router.get('/orders', requireAdminLogin, AdminPagesController.getOrders);

// Admin API Routes
router.delete('/api/users/:id', requireAdminLogin, AdminPagesController.deleteUser);

// Equipment endpoints with detailed logging
router.post('/api/equipment', requireAdminLogin, upload.single('image'), (req, res, next) => {
  console.log('=== POST /admin/api/equipment ===');
  console.log('Headers:', req.headers);
  console.log('Body received:', req.body);
  console.log('File received:', req.file);
  next();
}, AdminPagesController.addEquipment);

router.put('/api/equipment/:id', requireAdminLogin, upload.single('image'), (req, res, next) => {
  console.log('=== PUT /admin/api/equipment/:id ===');
  console.log('Equipment ID:', req.params.id);
  console.log('Body received:', req.body);
  console.log('File received:', req.file);
  next();
}, AdminPagesController.updateEquipment);

router.delete('/api/orders/:id', requireAdminLogin, AdminPagesController.deleteOrder);

router.delete('/api/equipment/:id', requireAdminLogin, AdminPagesController.deleteEquipment);

module.exports = router;
