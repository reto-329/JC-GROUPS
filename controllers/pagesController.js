const { User, Order, Cart } = require('../db');

const createSlug = (text) => {
  return text
    ? text.toString().toLowerCase().trim()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
    : '';
};

const addSlugToEquipment = (equipment) => {
  return equipment.map(item => ({ ...item, slug: createSlug(item.name) }));
};

/**
 * Pages Controller
 * Handles page rendering and basic operations
 */
const PagesController = {
  /**
   * Home page
   */
  getHome: async (req, res) => {
    try {
      const { Equipment, ServiceArea } = require('../db');
      const equipment = await Equipment.findAll();
      const equipmentWithSlug = equipment ? addSlugToEquipment(equipment) : [];
      const limitedEquipment = equipmentWithSlug.slice(0, 16);
      const serviceAreas = await ServiceArea.find({ isActive: true });
      
      const groupedByCategory = {};
      equipmentWithSlug.forEach(item => {
        const category = item.category || 'Other';
        if (!groupedByCategory[category]) {
          groupedByCategory[category] = [];
        }
        groupedByCategory[category].push(item);
      });
      
      res.render('index', { 
        title: 'JC Equipment Rentals - Home',
        equipment: limitedEquipment,
        serviceAreas: serviceAreas,
        categories: groupedByCategory
      });
    } catch (err) {
      console.error('Home page error:', err);
      res.render('index', { 
        title: 'JC Equipment Rentals - Home',
        equipment: [],
        serviceAreas: [],
        categories: {}
      });
    }
  },

  /**
   * About page
   */
  getAbout: (req, res) => {
    res.render('about', { title: 'JC Equipment Rentals - About Us' });
  },

  /**
   * Equipment page
   */
  getEquipment: async (req, res) => {
    try {
      const { Equipment } = require('../db');
      const equipment = await Equipment.findAll();
      const equipmentWithSlug = equipment ? addSlugToEquipment(equipment) : [];
      
      // Group equipment by category
      const groupedByCategory = {};
      if (equipmentWithSlug && equipmentWithSlug.length > 0) {
        equipmentWithSlug.forEach(item => {
          const category = item.category || 'Other';
          if (!groupedByCategory[category]) {
            groupedByCategory[category] = [];
          }
          groupedByCategory[category].push(item);
        });
      }
      
      res.render('equipment', { 
        title: 'JC Equipment Rentals - Equipment Rental',
        equipment: equipmentWithSlug || [],
        categories: groupedByCategory
      });
    } catch (err) {
      console.error('Equipment page error:', err);
      res.render('equipment', { 
        title: 'JC Equipment Rentals - Equipment Rental',
        equipment: [],
        categories: {}
      });
    }
  },

  /**
   * Contact page
   */
  getContact: (req, res) => {
    res.render('contact', { title: 'JC Equipment Rentals - Contact Us' });
  },

  /**
   * FAQ page
   */
  getFaq: (req, res) => {
    res.render('faq', { title: 'JC Equipment Rentals - FAQ' });
  },

  /**
   * Profile page (protected)
   */
  getProfile: async (req, res) => {
    if (!req.session.userId) {
      return res.redirect('/login');
    }
    try {
      const user = await User.findById(req.session.userId);
      if (!user) {
        req.session.destroy();
        return res.redirect('/login');
      }

      // Fetch order statistics
      const { Order } = require('../db');
      const userOrders = await Order.find({ userId: req.session.userId });
      
      // Calculate statistics
      const totalOrders = userOrders.length;
      const totalSpent = userOrders
        .filter(order => order.paymentStatus === 'paid')
        .reduce((sum, order) => sum + (order.totalAmount || 0), 0);
      
      // Active rentals = orders where rental period includes today or status is 'active'
      const today = new Date();
      const activeRentals = userOrders.filter(order => {
        if (order.status === 'completed' || order.status === 'cancelled') {
          return false;
        }
        if (order.rentalPeriod && order.rentalPeriod.startDate && order.rentalPeriod.endDate) {
          const startDate = new Date(order.rentalPeriod.startDate);
          const endDate = new Date(order.rentalPeriod.endDate);
          return today >= startDate && today <= endDate;
        }
        return order.status === 'active';
      }).length;
      const memberSince = user.createdAt ? new Date(user.createdAt).getFullYear() : new Date().getFullYear();

      // Get success message from session if it exists
      const successMessage = req.session.successMessage || null;
      delete req.session.successMessage; // Clear it after retrieval

      res.render('profile', { 
        title: 'JC Equipment Rentals - My Profile', 
        user,
        isLoggedIn: true,
        successMessage,
        statistics: {
          totalOrders,
          totalSpent: parseFloat(totalSpent).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          activeRentals,
          memberSince
        }
      });
    } catch (err) {
      console.error('Profile fetch error:', err);
      res.redirect('/login');
    }
  },

  postUpdateProfile: async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const { firstName, lastName, phone, address, city, state, zipCode } = req.body;
    
    try {
      await User.update(req.session.userId, { firstName, lastName, phone, address, city, state, zipCode });
      req.session.userName = `${firstName} ${lastName}`;
      res.json({ success: true, message: 'Profile updated successfully' });
    } catch (err) {
      console.error('Profile update error:', err);
      res.status(500).json({ success: false, message: 'Error updating profile' });
    }
  },

  /**
   * Rental Details page
   */
  getRentalDetails: async (req, res) => {
    try {
      const { Equipment, ServiceArea } = require('../db');
      console.log('Getting rental details for equipment ID:', req.params.id);
      
      const equipment = await Equipment.findById(req.params.id);
      console.log('Equipment found:', equipment ? equipment.name : 'NOT FOUND');
      
      if (!equipment) {
        return res.status(404).json({ error: 'Equipment not found' });
      }

      equipment.slug = createSlug(equipment.name);
      const canonicalUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

      // Fetch active service areas
      console.log('Fetching service areas...');
      const serviceAreas = await ServiceArea.find({ isActive: true });
      console.log('Service areas found:', serviceAreas.length);
      
      res.render('rental-details', {
        title: `Rent ${equipment.name} - JC Equipment Rentals`,
        equipment: equipment,
        serviceAreas: serviceAreas,
        isLoggedIn: !!req.session.userId,
        userId: req.session.userId,
        canonicalUrl
      });
    } catch (err) {
      console.error('Rental details error:', err);
      console.error('Error message:', err.message);
      console.error('Error stack:', err.stack);
      res.status(500).json({ error: 'Error loading rental details: ' + err.message });
    }
  },

  getRentalDetailsBySlug: async (req, res) => {
    try {
      const { Equipment, ServiceArea } = require('../db');
      const slug = req.params.slug;
      const equipmentList = await Equipment.findAll();
      const equipment = equipmentList
        .map(item => ({ ...item, slug: createSlug(item.name) }))
        .find(item => item.slug === slug);

      if (!equipment) {
        return res.status(404).send('Equipment not found');
      }

      const canonicalUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
      const serviceAreas = await ServiceArea.find({ isActive: true });

      res.render('rental-details', {
        title: `Rent ${equipment.name} - JC Equipment Rentals`,
        equipment,
        serviceAreas,
        isLoggedIn: !!req.session.userId,
        userId: req.session.userId,
        canonicalUrl
      });
    } catch (err) {
      console.error('Rental details by slug error:', err);
      res.status(500).json({ error: 'Error loading rental details: ' + err.message });
    }
  },

  /**
   * Orders page (protected)
   */
  /**
   * Orders page (protected)
   */
  getOrders: async (req, res) => {
    if (!req.session.userId) {
      return res.redirect('/login');
    }

    try {
      const user = await User.findById(req.session.userId);
      if (!user) {
        req.session.destroy();
        return res.redirect('/login');
      }
      const orders = await Order.find({ userId: req.session.userId }).sort({ createdAt: -1 });
      
      res.render('orders', { 
        title: 'JC Equipment Rentals - My Orders',
        user,
        orders: orders || [],
        isLoggedIn: true 
      });
    } catch (err) {
      console.error('Orders fetch error:', err);
      res.redirect('/login');
    }
  },

  /**
   * Security page (protected)
   */
  getSecurity: async (req, res) => {
    if (!req.session.userId) {
      return res.redirect('/login');
    }
    try {
      const user = await User.findById(req.session.userId);
      if (!user) {
        req.session.destroy();
        return res.redirect('/login');
      }
      res.render('security', { 
        title: 'JC Equipment Rentals - Security',
        user,
        isLoggedIn: true,
        message: null
      });
    } catch (err) {
      console.error('Security page error:', err);
      res.redirect('/login');
    }
  },

  /**
   * Handle password change
   */
  postChangePassword: async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.json({ success: false, message: 'All fields are required' });
    }

    if (newPassword.length < 6) {
      return res.json({ success: false, message: 'New password must be at least 6 characters' });
    }

    if (newPassword !== confirmPassword) {
      return res.json({ success: false, message: 'Passwords do not match' });
    }

    try {
      const user = await User.findById(req.session.userId);
      
      // Verify current password
      if (!user || !User.verifyPassword(currentPassword, user.password)) {
        return res.json({ success: false, message: 'Current password is incorrect' });
      }

      // Update password
      await User.updatePassword(req.session.userId, newPassword);
      
      res.json({ success: true, message: 'Password changed successfully' });
    } catch (err) {
      console.error('Password change error:', err);
      res.status(500).json({ success: false, message: 'Error changing password' });
    }
  },

  /**
   * Add rental item to cart
   */
  postAddToCart: async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const { equipmentId, equipmentName, quantity, dailyRate, startDate, endDate, days, subtotal, totalAmount, equipmentImage, postalCode } = req.body;

    console.log('[ADD TO CART] Starting - userId:', req.session.userId);
    console.log('[ADD TO CART] Equipment:', equipmentName, 'Quantity:', quantity);

    try {
      // Get or create user's cart
      let cart = await Cart.findOne({ userId: req.session.userId });
      if (!cart) {
        cart = new Cart({ userId: req.session.userId, items: [], totalAmount: 0 });
      }

      // Add item to cart
      const item = {
        equipmentId: equipmentId,
        equipmentName: equipmentName,
        equipmentImage: equipmentImage,
        quantity: parseInt(quantity),
        dailyRate: parseFloat(dailyRate),
        subtotal: parseFloat(subtotal),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        postalCode: postalCode
      };

      cart.addItem(item);
      const savedCart = await cart.save();
      
      console.log('[ADD TO CART] Item added successfully:', {
        equipmentName: equipmentName,
        quantity: parseInt(quantity),
        cartTotal: savedCart.totalAmount,
        itemsInCart: savedCart.items.length
      });
      
      res.json({ 
        success: true, 
        message: 'Item added to cart successfully',
        itemsCount: savedCart.items.length,
        totalAmount: savedCart.totalAmount
      });
    } catch (err) {
      console.error('[ADD TO CART] Error:', err.message);
      res.status(500).json({ 
        success: false, 
        message: 'Error adding item to cart: ' + err.message 
      });
    }
  },

  /**
   * Sync cart items from localStorage to database
   */
  postSyncCart: async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const { cartItems } = req.body;

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return res.json({ success: true, message: 'No items to sync' });
    }

    try {
      console.log('[SYNC CART] Starting sync for userId:', req.session.userId);
      console.log('[SYNC CART] Items to sync:', cartItems.length);

      // Get or create user's cart
      let cart = await Cart.findOne({ userId: req.session.userId });
      if (!cart) {
        cart = new Cart({ userId: req.session.userId, items: [], totalAmount: 0 });
      }

      // Add all items to cart
      for (let i = 0; i < cartItems.length; i++) {
        const item = cartItems[i];
        console.log(`[SYNC CART] Adding item ${i + 1}: ${item.equipmentName}`);
        
        cart.addItem({
          equipmentId: item.equipmentId,
          equipmentName: item.equipmentName,
          equipmentImage: item.equipmentImage,
          quantity: parseInt(item.quantity),
          dailyRate: parseFloat(item.dailyRate),
          subtotal: parseFloat(item.subtotal),
          startDate: new Date(item.startDate),
          endDate: new Date(item.endDate),
          postalCode: item.postalCode
        });
      }

      const savedCart = await cart.save();
      console.log('[SYNC CART] Sync complete! Cart now has', savedCart.items.length, 'items');
      
      res.json({ 
        success: true, 
        message: `${cartItems.length} item(s) synced to cart`,
        itemsCount: savedCart.items.length,
        totalAmount: savedCart.totalAmount
      });
    } catch (err) {
      console.error('[SYNC CART] Error:', err.message);
      res.status(500).json({ 
        success: false, 
        message: 'Error syncing cart: ' + err.message 
      });
    }
  },

  /**
   * Get cart page
   */
  getCart: async (req, res) => {
    try {
      let cartData = null;
      let isLoggedIn = !!req.session.userId;
      const cartSynced = req.session.cartSynced || false;
      delete req.session.cartSynced;

      console.log('\n========== CART PAGE ACCESS ==========');
      console.log('[CART] userId:', req.session.userId);
      console.log('[CART] isLoggedIn:', isLoggedIn);
      console.log('[CART] cartSynced:', cartSynced);
      
      // If user is logged in, fetch from Cart collection
      if (isLoggedIn) {
        console.log('[CART] Fetching cart from database for userId:', req.session.userId);
        cartData = await Cart.findOne({ userId: req.session.userId });
        
        if (cartData) {
          console.log('[CART] Found cart with', cartData.items.length, 'items');
          cartData.items.forEach((item, idx) => {
            console.log(`[CART] Item ${idx + 1}:`, {
              equipmentName: item.equipmentName,
              quantity: item.quantity,
              subtotal: item.subtotal
            });
          });
        } else {
          console.log('[CART] No cart found - creating empty cart');
          cartData = { items: [], totalAmount: 0 };
        }
      } else {
        console.log('[CART] User not logged in - cart will show localStorage items');
        cartData = { items: [], totalAmount: 0 };
      }
      
      console.log('========== END CART ACCESS ==========\n');
      
      res.render('cart', { 
        title: 'JC Equipment Rentals - Shopping Cart',
        cartItems: cartData?.items || [],
        totalAmount: cartData?.totalAmount || 0,
        isLoggedIn: isLoggedIn,
        cartSynced: cartSynced
      });
    } catch (err) {
      console.error('Cart fetch error:', err);
      res.render('cart', { 
        title: 'JC Equipment Rentals - Shopping Cart',
        cartItems: [],
        totalAmount: 0,
        isLoggedIn: !!req.session.userId,
        cartSynced: false,
        error: 'Error loading cart'
      });
    }
  },

  /**
   * Remove item from cart
   */
  postRemoveFromCart: async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    try {
      const itemIndex = parseInt(req.params.id);
      
      // Find user's cart
      const cart = await Cart.findOne({ userId: req.session.userId });
      
      if (!cart) {
        return res.status(404).json({ success: false, message: 'Cart not found' });
      }

      // Remove the item at the specified index
      if (itemIndex >= 0 && itemIndex < cart.items.length) {
        const removedItem = cart.items[itemIndex];
        cart.removeItem(itemIndex);
        await cart.save();
        
        console.log('[REMOVE FROM CART] Removed item:', removedItem.equipmentName, 'Cart now has', cart.items.length, 'items');
        
        res.json({ 
          success: true, 
          message: 'Item removed from cart',
          itemsCount: cart.items.length,
          totalAmount: cart.totalAmount
        });
      } else {
        res.status(400).json({ success: false, message: 'Invalid item index' });
      }
    } catch (err) {
      console.error('Remove from cart error:', err);
      res.status(500).json({ 
        success: false, 
        message: 'Error removing item from cart' 
      });
    }
  },

  /**
   * Update cart item quantity
   */
  postUpdateCart: async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    try {
      const { itemIndex, quantityChange } = req.body;
      
      // Find user's cart
      const cart = await Cart.findOne({ userId: req.session.userId });
      
      if (!cart) {
        return res.status(404).json({ success: false, message: 'Cart not found' });
      }

      if (itemIndex < 0 || itemIndex >= cart.items.length) {
        return res.status(400).json({ success: false, message: 'Invalid item index' });
      }

      // Update quantity
      const item = cart.items[itemIndex];
      const newQuantity = item.quantity + quantityChange;
      
      if (newQuantity < 1) {
        return res.status(400).json({ success: false, message: 'Quantity must be at least 1' });
      }

      item.quantity = newQuantity;
      
      // Recalculate total
      cart.calculateTotal();
      await cart.save();
      
      console.log('[UPDATE CART] Updated quantity for item at index', itemIndex, 'New total:', cart.totalAmount);
      
      res.json({ 
        success: true, 
        message: 'Quantity updated',
        newQuantity: newQuantity,
        newTotal: cart.totalAmount,
        cart: cart
      });
    } catch (err) {
      console.error('Update cart error:', err);
      res.status(500).json({ 
        success: false, 
        message: 'Error updating cart' 
      });
    }
  },

  /**
   * Get cart item count
   */
  getCartCount: async (req, res) => {
    try {
      let count = 0;

      if (req.session.userId) {
        // For logged-in users, count items in their cart
        const cart = await Cart.findOne({ userId: req.session.userId });
        count = cart ? cart.items.length : 0;
      } else {
        // For guests, should be handled by localStorage on client
        count = 0;
      }

      res.json({ success: true, count: count });
    } catch (err) {
      console.error('Get cart count error:', err);
      res.status(500).json({ 
        success: false, 
        count: 0,
        message: 'Error getting cart count' 
      });
    }
  },

  /**
   * Submit contact form
   */
  postContactForm: async (req, res) => {
    try {
      const { Contact } = require('../db');
      const { name, email, phone, equipment, startDate, rentalDuration, details, message } = req.body;

      if (!name || !email) {
        return res.status(400).json({ success: false, message: 'Name and email are required' });
      }

      const contactMessage = new Contact({
        name,
        email,
        phone: phone || '',
        equipment: equipment || '',
        startDate: startDate ? new Date(startDate) : null,
        rentalDuration: rentalDuration ? parseInt(rentalDuration) : null,
        details: details || '',
        message: message || '',
        status: 'new'
      });

      await contactMessage.save();
      res.json({ success: true, message: 'Message saved successfully' });
    } catch (err) {
      console.error('Contact form error:', err);
      res.status(500).json({ success: false, message: 'Error submitting contact form' });
    }
  }
};

module.exports = PagesController;
