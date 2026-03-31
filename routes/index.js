const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const PagesController = require('../controllers/pagesController');
const CheckoutController = require('../controllers/checkoutController');

// Middleware to check if user is logged in
const requireLogin = (req, res, next) => {
  if (req.session.userId) {
    next();
  } else {
    res.redirect('/login');
  }
};

// Middleware to pass user data to templates
router.use((req, res, next) => {
  res.locals.isLoggedIn = !!req.session.userId;
  res.locals.userId = req.session.userId;
  res.locals.userName = req.session.userName || '';
  next();
});

// Public Pages
router.get('/', PagesController.getHome);
router.get('/about', PagesController.getAbout);
router.get('/equipment', PagesController.getEquipment);
router.get('/equipment/:id/rent', PagesController.getRentalDetails);
router.get('/contact', PagesController.getContact);

// Authentication Routes
router.get('/login', AuthController.getLogin);
router.post('/login', AuthController.postLogin);
router.get('/register', AuthController.getRegister);
router.post('/register', AuthController.postRegister);
router.get('/logout', AuthController.logout);

// API endpoint for email validation
router.get('/api/check-email', AuthController.checkEmail);

// Protected Routes
router.get('/profile', requireLogin, PagesController.getProfile);
router.post('/profile/update', requireLogin, PagesController.postUpdateProfile);
router.get('/orders', requireLogin, PagesController.getOrders);
router.get('/security', requireLogin, PagesController.getSecurity);
router.post('/security/change-password', requireLogin, PagesController.postChangePassword);

// API endpoints for orders
router.post('/api/orders/add-to-cart', requireLogin, PagesController.postAddToCart);
router.post('/api/orders/sync-cart', requireLogin, PagesController.postSyncCart);
router.get('/api/cart/count', PagesController.getCartCount);

// Cart Routes
router.get('/cart', PagesController.getCart);
router.delete('/api/cart/remove/:id', requireLogin, PagesController.postRemoveFromCart);
router.put('/api/cart/update/:id', requireLogin, PagesController.postUpdateCart);

// Checkout Routes
router.get('/checkout', requireLogin, CheckoutController.getCheckout);
router.post('/api/checkout/process-payment', requireLogin, CheckoutController.postPayment);
router.get('/checkout/confirmation/:orderId', requireLogin, CheckoutController.getConfirmation);

module.exports = router;
