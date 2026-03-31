const express = require('express');
const router = express.Router();
const AdminAuthController = require('../controllers/adminAuthController');
const AdminPagesController = require('../controllers/adminPagesController');
const multer = require('multer');
const path = require('path');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../public/images/EQUIPMENTS'));
  },
  filename: (req, file, cb) => {
    cb(null, 'equipment-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
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
router.post('/api/equipment', requireAdminLogin, (req, res, next) => {
  console.log('=== POST /admin/api/equipment ===');
  console.log('Headers:', req.headers);
  console.log('Proceeding with multer...');
  next();
}, upload.single('image'), (req, res, next) => {
  console.log('=== After multer middleware ===');
  console.log('File received:', req.file);
  console.log('Body received:', req.body);
  next();
}, AdminPagesController.addEquipment);

router.put('/api/equipment/:id', requireAdminLogin, (req, res, next) => {
  console.log('=== PUT /admin/api/equipment/:id ===');
  console.log('Equipment ID:', req.params.id);
  console.log('Headers:', req.headers);
  next();
}, upload.single('image'), (req, res, next) => {
  console.log('=== After multer middleware ===');
  console.log('File received:', req.file);
  console.log('Body received:', req.body);
  next();
}, AdminPagesController.updateEquipment);

router.delete('/api/orders/:id', requireAdminLogin, AdminPagesController.deleteOrder);

router.delete('/api/equipment/:id', requireAdminLogin, AdminPagesController.deleteEquipment);

module.exports = router;
