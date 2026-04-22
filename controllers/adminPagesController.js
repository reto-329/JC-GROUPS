const { Admin, User, UserModel, EquipmentModel, Order } = require('../db');

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

      // Fetch real stats from database
      // Count total users
      const totalUsers = await UserModel.countDocuments();
      
      // Count total equipment
      const totalEquipment = await EquipmentModel.countDocuments();
      
      // Count active orders (currently ongoing rentals)
      const activeOrders = await Order.countDocuments({ 
        status: { $in: ['active', 'confirmed'] } 
      });
      
      // Calculate total revenue from all completed orders
      const revenueResult = await Order.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } }
      ]);
      
      const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

      res.render('admin/dashboard', {
        pageTitle: 'Dashboard',
        title: 'JC Rentals - Admin Dashboard',
        adminName: `${admin.firstName} ${admin.lastName}`,
        adminRole: admin.role,
        isAdminLoggedIn: true,
        currentPage: 'dashboard',
        success,
        lastLogin,
        stats: {
          totalUsers,
          totalEquipment,
          activeOrders,
          totalRevenue: totalRevenue.toFixed(2)
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
        pageTitle: 'Users',
        title: 'JC Rentals - Manage Users',
        adminName: `${admin.firstName} ${admin.lastName}`,
        adminRole: admin.role,
        isAdminLoggedIn: true,
        currentPage: 'users',
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
        pageTitle: 'Equipment',
        title: 'JC Rentals - Manage Equipment',
        adminName: `${admin.firstName} ${admin.lastName}`,
        adminRole: admin.role,
        isAdminLoggedIn: true,
        currentPage: 'equipment',
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
        pageTitle: 'Orders',
        title: 'JC Rentals - Manage Orders',
        adminName: `${admin.firstName} ${admin.lastName}`,
        adminRole: admin.role,
        isAdminLoggedIn: true,
        currentPage: 'orders',
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
   * Update Order Status
   * Only admins can update order status to "returned" or other statuses
   */
  updateOrderStatus: async (req, res) => {
    if (!req.session.adminId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    try {
      const { id } = req.params;
      const { status } = req.body;

      // Validate status
      const validStatuses = ['pending', 'confirmed', 'active', 'returned', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status' });
      }

      const Order = require('../models/Order');
      const updatedOrder = await Order.findByIdAndUpdate(
        id,
        { status: status, updatedAt: new Date() },
        { new: true }
      );

      if (!updatedOrder) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

      console.log(`[ADMIN] Order ${id} status updated to: ${status}`);
      res.json({ success: true, message: 'Order status updated successfully', order: updatedOrder });
    } catch (err) {
      console.error('Update order status error:', err);
      res.status(500).json({ success: false, message: 'Error updating order status' });
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
      
      // Define allowed categories
      const ALLOWED_CATEGORIES = ['Tools', 'Machinery', 'Vehicles', 'Safety', 'Other'];
      const category = req.body.category ? req.body.category.trim() : null;
      
      console.log('Category value from form:', category);
      console.log('Category type:', typeof category);
      console.log('Category length:', category ? category.length : 'null');
      
      // Validate category
      if (!category) {
        console.error('ERROR: Category is empty or not provided');
        console.error('Received body keys:', Object.keys(req.body));
        return res.status(400).json({ 
          success: false, 
          message: 'Category is required. Make sure to select a category from the dropdown.' 
        });
      }
      
      if (!ALLOWED_CATEGORIES.includes(category)) {
        console.error(`ERROR: Invalid category "${category}". Allowed: ${ALLOWED_CATEGORIES.join(', ')}`);
        return res.status(400).json({ 
          success: false, 
          message: `Invalid category. Allowed categories are: ${ALLOWED_CATEGORIES.join(', ')}` 
        });
      }
      
      console.log('✓ Category validated:', category);
      
      const equipmentData = {
        name: req.body.name,
        description: req.body.description,
        category: category,
        dailyRate: parseFloat(req.body.dailyRate),
        weeklyRate: parseFloat(req.body.weeklyRate) || 0,
        monthlyRate: parseFloat(req.body.monthlyRate) || 0,
        quantity: parseInt(req.body.quantity),
        image: req.file ? req.file.path : null,
        imagePublicId: req.file ? req.file.filename : null,
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
      const cloudinary = require('cloudinary').v2;
      
      // Get equipment to retrieve image public_id
      const equipment = await Equipment.findById(equipmentId);
      if (equipment && equipment.imagePublicId) {
        try {
          // Delete image from Cloudinary
          await cloudinary.uploader.destroy(equipment.imagePublicId);
          console.log('Image deleted from Cloudinary:', equipment.imagePublicId);
        } catch (err) {
          console.error('Error deleting image from Cloudinary:', err);
          // Continue with equipment deletion even if image deletion fails
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
      const cloudinary = require('cloudinary').v2;
      
      const equipmentId = req.params.id;
      
      // Get current equipment to retrieve old image public_id
      const equipment = await Equipment.findById(equipmentId);
      if (!equipment) {
        return res.status(404).json({ success: false, message: 'Equipment not found' });
      }
      
      // Validate category (only required if provided)
      const ALLOWED_CATEGORIES = ['Tools', 'Machinery', 'Vehicles', 'Safety', 'Other'];
      const category = req.body.category ? req.body.category.trim() : null;
      
      // Use provided category or keep existing one
      const finalCategory = category || equipment.category;
      
      if (!finalCategory || !ALLOWED_CATEGORIES.includes(finalCategory)) {
        return res.status(400).json({ 
          success: false, 
          message: `Invalid category. Allowed categories are: ${ALLOWED_CATEGORIES.join(', ')}` 
        });
      }
      
      let imagePath = equipment.image;
      let imagePublicId = equipment.imagePublicId;
      
      // Delete old image from Cloudinary if new image is provided
      if (req.file) {
        if (equipment.imagePublicId) {
          try {
            await cloudinary.uploader.destroy(equipment.imagePublicId);
            console.log('Old image deleted from Cloudinary:', equipment.imagePublicId);
          } catch (err) {
            console.error('Error deleting old image from Cloudinary:', err);
            // Continue with update even if old image deletion fails
          }
        }
        // Use Cloudinary URL and public ID
        imagePath = req.file.path;
        imagePublicId = req.file.filename;
      }
      
      const equipmentData = {
        name: req.body.name,
        description: req.body.description,
        category: finalCategory,
        dailyRate: parseFloat(req.body.dailyRate),
        weeklyRate: parseFloat(req.body.weeklyRate) || 0,
        monthlyRate: parseFloat(req.body.monthlyRate) || 0,
        quantity: parseInt(req.body.quantity),
        image: imagePath,
        imagePublicId: imagePublicId,
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
  },

  /**
   * Service Areas Management Page
   */
  getServiceAreas: async (req, res) => {
    if (!req.session.adminId) {
      return res.redirect('/admin/login');
    }

    try {
      const admin = await Admin.findById(req.session.adminId);
      const { ServiceArea } = require('../db');
      
      const serviceAreas = await ServiceArea.find().sort({ createdAt: -1 });
      
      res.render('admin/service-areas', {
        pageTitle: 'Service Areas',
        title: 'JC Rentals - Manage Service Areas',
        adminName: `${admin.firstName} ${admin.lastName}`,
        adminRole: admin.role,
        isAdminLoggedIn: true,
        currentPage: 'service-areas',
        serviceAreas: serviceAreas
      });
    } catch (err) {
      console.error('Service areas page error:', err);
      res.redirect('/admin/login');
    }
  },

  /**
   * Add Service Area (postal code)
   */
  addServiceArea: async (req, res) => {
    if (!req.session.adminId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    try {
      const { ServiceArea } = require('../db');
      let { postalCode, city, province, deliveryFee } = req.body;

      console.log('AddServiceArea - Input:', { postalCode, city, province, deliveryFee });

      // Validate required fields
      if (!postalCode || !city || !province) {
        return res.status(400).json({
          success: false,
          message: 'Postal code, city, and province are required'
        });
      }

      // Normalize postal code before validating
      postalCode = postalCode.replace(/\s/g, '').toUpperCase();
      
      // Validate postal code format
      if (!/^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(postalCode)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid postal code format. Use format like K0L1W0'
        });
      }

      // Check if postal code already exists
      const existing = await ServiceArea.findOne({ postalCode: postalCode });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'This postal code already exists'
        });
      }

      const serviceArea = new ServiceArea({
        postalCode: postalCode,
        city: city.trim(),
        province: province.trim(),
        deliveryFee: parseFloat(deliveryFee) || 15.00
      });

      console.log('ServiceArea object before save:', serviceArea);

      await serviceArea.save();

      console.log('ServiceArea saved successfully:', serviceArea);

      res.json({
        success: true,
        message: 'Service area added successfully',
        serviceArea: serviceArea
      });
    } catch (err) {
      console.error('Add service area error:', err);
      console.error('Error message:', err.message);
      console.error('Error stack:', err.stack);
      
      // Handle validation errors
      if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map(e => e.message);
        return res.status(400).json({
          success: false,
          message: 'Validation error: ' + messages.join(', ')
        });
      }

      // Handle duplicate key error
      if (err.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'This postal code already exists'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error adding service area: ' + (err.message || err.toString())
      });
    }
  },

  /**
   * Update Service Area
   */
  updateServiceArea: async (req, res) => {
    if (!req.session.adminId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    try {
      const { ServiceArea } = require('../db');
      const { id } = req.params;
      let { postalCode, city, province, deliveryFee, isActive } = req.body;

      // Validate ID format
      if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid service area ID'
        });
      }

      const updatedData = {};
      
      if (postalCode) {
        postalCode = postalCode.replace(/\s/g, '').toUpperCase();
        
        // Validate postal code format
        if (!/^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(postalCode)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid postal code format. Use format like K0L1W0'
          });
        }
        
        updatedData.postalCode = postalCode;
      }
      
      if (city) updatedData.city = city.trim();
      if (province) updatedData.province = province.trim();
      if (deliveryFee !== undefined) updatedData.deliveryFee = parseFloat(deliveryFee);
      if (isActive !== undefined) updatedData.isActive = isActive;
      
      // Always update the timestamp
      updatedData.updatedAt = new Date();

      const serviceArea = await ServiceArea.findByIdAndUpdate(
        id,
        updatedData,
        { new: true, runValidators: true }
      );

      if (!serviceArea) {
        return res.status(404).json({
          success: false,
          message: 'Service area not found'
        });
      }

      res.json({
        success: true,
        message: 'Service area updated successfully',
        serviceArea: serviceArea
      });
    } catch (err) {
      console.error('Update service area error:', err);
      console.error('Error stack:', err.stack);
      
      // Handle validation errors
      if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map(e => e.message);
        return res.status(400).json({
          success: false,
          message: 'Validation error: ' + messages.join(', ')
        });
      }

      // Handle duplicate key error
      if (err.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'This postal code already exists'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error updating service area: ' + (err.message || err.toString())
      });
    }
  },

  /**
   * Delete Service Area
   */
  deleteServiceArea: async (req, res) => {
    if (!req.session.adminId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    try {
      const { ServiceArea } = require('../db');
      const { id } = req.params;

      // Validate ID format
      if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid service area ID'
        });
      }

      const deleteResult = await ServiceArea.findByIdAndDelete(id);

      if (!deleteResult) {
        return res.status(404).json({
          success: false,
          message: 'Service area not found'
        });
      }

      res.json({
        success: true,
        message: 'Service area deleted successfully'
      });
    } catch (err) {
      console.error('Delete service area error:', err);
      console.error('Error stack:', err.stack);
      res.status(500).json({
        success: false,
        message: 'Error deleting service area: ' + (err.message || err.toString())
      });
    }
  },

  /**
   * Contact Messages Page
   */
  getContacts: async (req, res) => {
    if (!req.session.adminId) {
      return res.redirect('/admin/login');
    }

    try {
      const admin = await Admin.findById(req.session.adminId);
      const { Contact } = require('../db');
      
      // Fetch all contact messages sorted by newest first
      const contacts = await Contact.find().sort({ createdAt: -1 });
      
      // Count messages by status
      const newCount = await Contact.countDocuments({ status: 'new' });
      const readCount = await Contact.countDocuments({ status: 'read' });
      const respondedCount = await Contact.countDocuments({ status: 'responded' });

      res.render('admin/contacts', {
        pageTitle: 'Contact Messages',
        title: 'JC Rentals - Contact Messages',
        adminName: `${admin.firstName} ${admin.lastName}`,
        adminRole: admin.role,
        isAdminLoggedIn: true,
        currentPage: 'contacts',
        contacts: contacts,
        stats: {
          newCount,
          readCount,
          respondedCount,
          totalCount: contacts.length
        }
      });
    } catch (err) {
      console.error('Contacts page error:', err);
      res.redirect('/admin/login');
    }
  },

  /**
   * Update Contact Status
   */
  updateContactStatus: async (req, res) => {
    if (!req.session.adminId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    try {
      const { Contact } = require('../db');
      const { id: contactId } = req.params;
      const { status } = req.body;

      if (!['new', 'read', 'responded'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status' });
      }

      const updatedContact = await Contact.findByIdAndUpdate(
        contactId,
        { status: status },
        { new: true }
      );

      if (!updatedContact) {
        return res.status(404).json({ success: false, message: 'Contact not found' });
      }

      res.json({ success: true, message: 'Status updated successfully', contact: updatedContact });
    } catch (err) {
      console.error('Update contact status error:', err);
      res.status(500).json({ success: false, message: 'Error updating status' });
    }
  },

  /**
   * Delete Contact Message
   */
  deleteContact: async (req, res) => {
    if (!req.session.adminId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    try {
      const { Contact } = require('../db');
      const contactId = req.params.id;

      const deletedContact = await Contact.findByIdAndDelete(contactId);

      if (!deletedContact) {
        return res.status(404).json({ success: false, message: 'Contact not found' });
      }

      res.json({ success: true, message: 'Contact deleted successfully' });
    } catch (err) {
      console.error('Delete contact error:', err);
      res.status(500).json({ success: false, message: 'Error deleting contact' });
    }
  },

  /**
   * Get Single Contact
   */
  getContact: async (req, res) => {
    if (!req.session.adminId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    try {
      const { Contact } = require('../db');
      const contact = await Contact.findById(req.params.id);

      if (!contact) {
        return res.status(404).json({ success: false, message: 'Contact not found' });
      }

      res.json({ success: true, contact: contact });
    } catch (err) {
      console.error('Get contact error:', err);
      res.status(500).json({ success: false, message: 'Error retrieving contact' });
    }
  }
};

module.exports = AdminPagesController;
