const { Admin, User } = require('../db');

/**
 * Admin Pages Controller
 * Handles admin dashboard and pages
 */
const AdminPagesController = {
  /**
   * Admin Dashboard
   */
  getDashboard: async (req, res) => {
    if (!req.session.adminId) {
      return res.redirect('/admin/login');
    }

    try {
      const admin = await Admin.findById(req.session.adminId);
      if (!admin) {
        req.session.destroy();
        return res.redirect('/admin/login');
      }

      const success = req.session.successMessage || null;
      delete req.session.successMessage;

      // Format last login
      const lastLogin = admin.lastLogin 
        ? new Date(admin.lastLogin).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        : null;

      res.render('admin/dashboard', {
        title: 'JC Rentals - Admin Dashboard',
        adminName: `${admin.firstName} ${admin.lastName}`,
        adminRole: admin.role,
        isAdminLoggedIn: true,
        success,
        lastLogin,
        stats: {
          totalUsers: 0,
          totalEquipment: 0,
          activeOrders: 0,
          totalRevenue: 0
        }
      });
    } catch (err) {
      console.error('Dashboard error:', err);
      res.redirect('/admin/login');
    }
  },

  /**
   * Users Management Page
   */
  getUsers: async (req, res) => {
    if (!req.session.adminId) {
      return res.redirect('/admin/login');
    }

    try {
      const admin = await Admin.findById(req.session.adminId);
      
      // Fetch all users from database
      const users = await User.findAll();
      
      // Import Order model to count rentals
      const Order = require('../models/Order');
      
      // Enrich users with rental counts
      const usersWithRentals = await Promise.all(users.map(async (user) => {
        const rentalCount = await Order.countDocuments({ userId: user._id });
        return {
          ...user,
          id: user._id,
          rentals: rentalCount,
          status: user.isActive ? 'active' : 'inactive'
        };
      }));
      
      res.render('admin/users', {
        title: 'JC Rentals - Manage Users',
        adminName: `${admin.firstName} ${admin.lastName}`,
        adminRole: admin.role,
        isAdminLoggedIn: true,
        users: usersWithRentals
      });
    } catch (err) {
      console.error('Users page error:', err);
      res.redirect('/admin/login');
    }
  },

  /**
   * Equipment Management Page
   */
  getEquipment: async (req, res) => {
    if (!req.session.adminId) {
      return res.redirect('/admin/login');
    }

    try {
      const admin = await Admin.findById(req.session.adminId);
      const { Equipment } = require('../db');
      
      // Fetch all equipment from database
      const equipment = await Equipment.findAll();
      
      res.render('admin/equipment', {
        title: 'JC Rentals - Manage Equipment',
        adminName: `${admin.firstName} ${admin.lastName}`,
        adminRole: admin.role,
        isAdminLoggedIn: true,
        equipment: equipment
      });
    } catch (err) {
      console.error('Equipment page error:', err);
      res.redirect('/admin/login');
    }
  },

  /**
   * Orders Management Page
   */
  getOrders: async (req, res) => {
    if (!req.session.adminId) {
      return res.redirect('/admin/login');
    }

    try {
      const admin = await Admin.findById(req.session.adminId);
      const Order = require('../models/Order');

      const orders = await Order.find()
        .populate('userId', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .lean();

      res.render('admin/orders', {
        title: 'JC Rentals - Manage Orders',
        adminName: `${admin.firstName} ${admin.lastName}`,
        adminRole: admin.role,
        isAdminLoggedIn: true,
        orders
      });
    } catch (err) {
      console.error('Orders page error:', err);
      res.redirect('/admin/login');
    }
  },

  /**
   * Delete Order
   */
  deleteOrder: async (req, res) => {
    if (!req.session.adminId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    try {
      const Order = require('../models/Order');
      await Order.findByIdAndDelete(req.params.id);
      res.json({ success: true, message: 'Order deleted successfully' });
    } catch (err) {
      console.error('Delete order error:', err);
      res.status(500).json({ success: false, message: 'Error deleting order' });
    }
  },

  /**
   * Delete User
   */
  deleteUser: async (req, res) => {
    if (!req.session.adminId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    try {
      const userId = req.params.id;
      const { User } = require('../db');
      
      await User.delete(userId);
      
      res.json({ 
        success: true, 
        message: 'User deleted successfully'
      });
    } catch (err) {
      console.error('Delete user error:', err);
      res.status(500).json({ 
        success: false, 
        message: 'Error deleting user' 
      });
    }
  },

  /**
   * Add Equipment
   */
  addEquipment: async (req, res) => {
    console.log('=== Add Equipment Handler ===');
    console.log('Session Admin ID:', req.session.adminId);
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);
    
    if (!req.session.adminId) {
      console.log('Unauthorized - no admin session');
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    try {
      const { Equipment } = require('../db');
      
      const equipmentData = {
        name: req.body.name,
        description: req.body.description,
        category: req.body.category,
        dailyRate: parseFloat(req.body.dailyRate),
        weeklyRate: parseFloat(req.body.weeklyRate) || 0,
        monthlyRate: parseFloat(req.body.monthlyRate) || 0,
        quantity: parseInt(req.body.quantity),
        image: req.file ? `/images/EQUIPMENTS/${req.file.filename}` : null,
        manufacturer: req.body.manufacturer || '',
        model: req.body.model || ''
      };

      console.log('Equipment data to save:', equipmentData);
      
      const result = await Equipment.create(equipmentData);
      console.log('Equipment created successfully:', result);
      
      res.json({ 
        success: true, 
        message: 'Equipment added successfully',
        equipment: result
      });
    } catch (err) {
      console.error('Add equipment error:', err);
      console.error('Error stack:', err.stack);
      res.status(500).json({ 
        success: false, 
        message: 'Error adding equipment: ' + err.message
      });
    }
  },

  /**
   * Delete Equipment
   */
  deleteEquipment: async (req, res) => {
    if (!req.session.adminId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    try {
      const equipmentId = req.params.id;
      const { Equipment } = require('../db');
      const path = require('path');
      const fs = require('fs');
      
      // Get equipment to retrieve image path
      const equipment = await Equipment.findById(equipmentId);
      if (equipment && equipment.image) {
        // Extract filename from image path
        const imagePath = path.join(__dirname, '../public', equipment.image);
        
        // Delete image file if it exists
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
          console.log('Image deleted:', imagePath);
        }
      }
      
      // Delete equipment from database
      await Equipment.delete(equipmentId);
      
      res.json({ 
        success: true, 
        message: 'Equipment deleted successfully'
      });
    } catch (err) {
      console.error('Delete equipment error:', err);
      res.status(500).json({ 
        success: false, 
        message: 'Error deleting equipment'
      });
    }
  },

  /**
   * Update Equipment
   */
  updateEquipment: async (req, res) => {
    console.log('=== Update Equipment Handler ===');
    console.log('Session Admin ID:', req.session.adminId);
    console.log('Equipment ID:', req.params.id);
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);
    
    if (!req.session.adminId) {
      console.log('Unauthorized - no admin session');
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    try {
      const { Equipment } = require('../db');
      const path = require('path');
      const fs = require('fs');
      
      const equipmentId = req.params.id;
      
      // Get current equipment to retrieve old image path
      const equipment = await Equipment.findById(equipmentId);
      if (!equipment) {
        return res.status(404).json({ success: false, message: 'Equipment not found' });
      }
      
      let imagePath = equipment.image;
      
      // Delete old image if new image is provided
      if (req.file) {
        if (equipment.image) {
          const oldImagePath = path.join(__dirname, '../public', equipment.image);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
            console.log('Old image deleted:', oldImagePath);
          }
        }
        imagePath = `/images/EQUIPMENTS/${req.file.filename}`;
      }
      
      const equipmentData = {
        name: req.body.name,
        description: req.body.description,
        category: req.body.category,
        dailyRate: parseFloat(req.body.dailyRate),
        weeklyRate: parseFloat(req.body.weeklyRate) || 0,
        monthlyRate: parseFloat(req.body.monthlyRate) || 0,
        quantity: parseInt(req.body.quantity),
        image: imagePath,
        manufacturer: req.body.manufacturer || '',
        model: req.body.model || ''
      };

      console.log('Equipment data to update:', equipmentData);
      
      const result = await Equipment.update(equipmentId, equipmentData);
      console.log('Equipment updated successfully:', result);
      
      res.json({ 
        success: true, 
        message: 'Equipment updated successfully',
        equipment: result
      });
    } catch (err) {
      console.error('Update equipment error:', err);
      console.error('Error stack:', err.stack);
      res.status(500).json({ 
        success: false, 
        message: 'Error updating equipment: ' + err.message
      });
    }
  }
};

module.exports = AdminPagesController;
