const { Admin } = require('../db');

/**
 * Admin Authentication Controller
 * Handles admin login, logout, and dashboard
 */
const AdminAuthController = {
  /**
   * Render admin login page
   */
  getAdminLogin: (req, res) => {
    // Redirect to dashboard if already logged in
    if (req.session.adminId) {
      return res.redirect('/admin/dashboard');
    }
    res.render('admin/login', { 
      title: 'JC Rentals - Admin Login', 
      message: null,
      success: req.query.success || null,
      isAdminLoggedIn: false
    });
  },

  /**
   * Handle admin login
   */
  postAdminLogin: async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.render('admin/login', {
        title: 'JC Rentals - Admin Login',
        message: 'Please provide both email and password',
        success: null,
        isAdminLoggedIn: false
      });
    }

    try {
      const admin = await Admin.findByEmail(email);

      if (!admin || !Admin.verifyPassword(password, admin.password)) {
        return res.render('admin/login', {
          title: 'JC Rentals - Admin Login',
          message: 'Email or password is incorrect',
          success: null,
          isAdminLoggedIn: false
        });
      }

      if (!admin.isActive) {
        return res.render('admin/login', {
          title: 'JC Rentals - Admin Login',
          message: 'Your account has been deactivated',
          success: null,
          isAdminLoggedIn: false
        });
      }

      // Set admin session
      req.session.adminId = admin.id;
      req.session.adminEmail = admin.email;
      req.session.adminName = `${admin.firstName} ${admin.lastName}`;
      req.session.adminRole = admin.role;
      req.session.successMessage = `Welcome back, ${admin.firstName}! You have been successfully logged in.`;

      // Update last login
      await Admin.updateLastLogin(admin.id);

      // Save session explicitly before redirecting
      console.log('[ADMIN AUTH] Attempting to save admin session...');
      console.log('[ADMIN AUTH] Session adminId:', req.session.adminId);
      req.session.save((err) => {
        if (err) {
          console.error('[ADMIN AUTH] ❌ Session save error:', err);
          return res.render('admin/login', {
            title: 'JC Rentals - Admin Login',
            message: 'Session error. Please try again.',
            success: null,
            isAdminLoggedIn: false
          });
        }
        console.log('[ADMIN AUTH] ✓ Session saved successfully. Redirecting to /admin/dashboard');
        res.redirect('/admin/dashboard');
      });
    } catch (err) {
      console.error('Admin login error:', err);
      res.render('admin/login', {
        title: 'JC Rentals - Admin Login',
        message: 'An error occurred. Please try again.',
        success: null,
        isAdminLoggedIn: false
      });
    }
  },

  /**
   * Handle admin logout
   */
  adminLogout: (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).send('Could not log out');
      }
      res.redirect('/admin/login');
    });
  }
};

module.exports = AdminAuthController;
