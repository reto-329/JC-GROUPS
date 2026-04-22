const { User, Cart } = require('../db');
const { Order } = require('../db');

/**
 * Authentication Controller
 * Handles all authentication-related operations
 */
const AuthController = {
  /**
   * Render login page
   */
  getLogin: (req, res) => {
    // Redirect to dashboard if already logged in
    if (req.session.userId) {
      return res.redirect('/profile');
    }
    res.render('login', { 
      title: 'JC Rentals - Login', 
      message: null,
      success: req.query.success || null,
      redirect: req.query.redirect || '',
      isLoggedIn: false
    });
  },

  /**
   * Handle login form submission
   */
  postLogin: async (req, res) => {
    const { email, password, remember, redirect, cartData } = req.body;

    if (!email || !password) {
      return res.render('login', {
        title: 'JC Rentals - Login',
        message: 'Please provide both email and password',
        success: null,
        redirect: redirect || '',
        isLoggedIn: false
      });
    }

    try {
      const user = await User.findByEmail(email);

      if (!user || !User.verifyPassword(password, user.password)) {
        return res.render('login', {
          title: 'JC Rentals - Login',
          message: 'Email or password is incorrect',
          success: null,
          redirect: redirect || '',
          isLoggedIn: false
        });
      }

      req.session.userId = user._id;
      req.session.userEmail = user.email;
      req.session.userName = `${user.firstName} ${user.lastName}`;
      req.session.successMessage = `Welcome back, ${user.firstName}! You have been successfully logged in.`;

      if (remember) req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;

      // Sync localStorage cart items to Cart collection if present
      console.log('[CART SYNC] ========== STARTING LOGIN SYNC ==========');
      console.log('[CART SYNC] User ID:', user._id);
      console.log('[CART SYNC] cartData received:', cartData ? `YES (${cartData.length} chars)` : 'NO');
      
      if (cartData) {
        try {
          console.log('[CART SYNC] Attempting to parse cartData...');
          const cartItems = JSON.parse(cartData);
          console.log('[CART SYNC] Parse successful. cartItems length:', Array.isArray(cartItems) ? cartItems.length : 'NOT ARRAY');
          
          if (Array.isArray(cartItems) && cartItems.length > 0) {
            console.log('[CART SYNC] Found items to sync. Processing', cartItems.length, 'items...');
            
            // Get or create user's cart
            let cart = await Cart.findOne({ userId: user._id });
            if (!cart) {
              cart = new Cart({ userId: user._id, items: [], totalAmount: 0 });
            }
            
            // Add all items to cart
            for (let i = 0; i < cartItems.length; i++) {
              const item = cartItems[i];
              console.log(`[CART SYNC] Processing item ${i + 1}:`, item.equipmentName, 'ID:', item.equipmentId);
              
              try {
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
                
                console.log(`[CART SYNC] Item ${i + 1} added to cart:`, item.equipmentName);
              } catch (itemErr) {
                console.error(`[CART SYNC] ERROR adding item ${i + 1}:`, itemErr.message);
                // Continue processing other items even if one fails
              }
            }
            
            // Save the entire cart once
            const savedCart = await cart.save();
            console.log('[CART SYNC] Cart saved! Total items:', savedCart.items.length);
            req.session.cartSynced = true;
          } else {
            console.log('[CART SYNC] cartItems is not an array or is empty');
          }
        } catch (e) {
          console.error('[CART SYNC] ERROR during parse/sync:', e.message);
          console.error('[CART SYNC] Stack:', e.stack);
        }
      } else {
        console.log('[CART SYNC] No cartData to sync');
      }
      
      console.log('[CART SYNC] ========== SYNC COMPLETE ==========');

      // Check if there's a redirect parameter from the form
      const redirectTo = redirect === 'cart' ? '/cart' : '/profile';
      res.redirect(redirectTo);
    } catch (err) {
      res.render('login', {
        title: 'JC Rentals - Login',
        message: 'An error occurred. Please try again.',
        success: null,
        redirect: redirect || '',
        isLoggedIn: false
      });
    }
  },

  /**
   * Render registration page
   */
  getRegister: (req, res) => {
    if (req.session.userId) {
      return res.redirect('/profile');
    }
    res.render('register', { 
      title: 'JC Rentals - Create Account', 
      message: null,
      redirect: req.query.redirect || '',
      isLoggedIn: false
    });
  },

  /**
   * Handle registration form submission
   */
  postRegister: async (req, res) => {
    const { email, password, confirmPassword, firstName, lastName, phone, redirect, cartData } = req.body;

    if (!email || !password || !confirmPassword || !firstName || !lastName) {
      return res.render('register', {
        title: 'JC Rentals - Create Account',
        message: 'Please fill in all fields',
        redirect: redirect || '',
        isLoggedIn: false
      });
    }

    if (password !== confirmPassword) {
      return res.render('register', {
        title: 'JC Rentals - Create Account',
        message: 'Passwords do not match',
        redirect: redirect || '',
        isLoggedIn: false
      });
    }

    if (password.length < 6) {
      return res.render('register', {
        title: 'JC Rentals - Create Account',
        message: 'Password must be at least 6 characters',
        redirect: redirect || '',
        isLoggedIn: false
      });
    }

    try {
      const existing = await User.findByEmail(email);
      if (existing) {
        return res.render('register', {
          title: 'JC Rentals - Create Account',
          message: 'Email already registered',
          redirect: redirect || '',
          isLoggedIn: false
        });
      }

      const newUser = await User.create({ email, password, firstName, lastName, phone });
      
      // Auto-login user after account creation
      req.session.userId = newUser.id;
      req.session.userEmail = newUser.email;
      req.session.userName = `${firstName} ${lastName}`;
      req.session.successMessage = `Welcome to JC Rentals, ${firstName}! Your account has been created successfully.`;

      // Sync localStorage cart items to Cart collection if present
      console.log('[CART SYNC - REGISTER] ========== STARTING REGISTRATION SYNC ==========');
      console.log('[CART SYNC - REGISTER] User ID:', newUser.id);
      console.log('[CART SYNC - REGISTER] cartData received:', cartData ? `YES (${cartData.length} chars)` : 'NO');
      
      if (cartData) {
        try {
          console.log('[CART SYNC - REGISTER] Attempting to parse cartData...');
          const cartItems = JSON.parse(cartData);
          console.log('[CART SYNC - REGISTER] Parse successful. cartItems length:', Array.isArray(cartItems) ? cartItems.length : 'NOT ARRAY');
          
          if (Array.isArray(cartItems) && cartItems.length > 0) {
            console.log('[CART SYNC - REGISTER] Found items to sync. Processing', cartItems.length, 'items...');
            
            // Get or create user's cart
            let cart = await Cart.findOne({ userId: newUser.id });
            if (!cart) {
              cart = new Cart({ userId: newUser.id, items: [], totalAmount: 0 });
            }
            
            // Add all items to cart
            for (let i = 0; i < cartItems.length; i++) {
              const item = cartItems[i];
              console.log(`[CART SYNC - REGISTER] Processing item ${i + 1}:`, item.equipmentName, 'ID:', item.equipmentId);
              
              try {
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
                
                console.log(`[CART SYNC - REGISTER] Item ${i + 1} added to cart:`, item.equipmentName);
              } catch (itemErr) {
                console.error(`[CART SYNC - REGISTER] ERROR adding item ${i + 1}:`, itemErr.message);
                // Continue processing other items even if one fails
              }
            }
            
            // Save the entire cart once
            const savedCart = await cart.save();
            console.log('[CART SYNC - REGISTER] Cart saved! Total items:', savedCart.items.length);
            req.session.cartSynced = true;
          } else {
            console.log('[CART SYNC - REGISTER] cartItems is not an array or is empty');
          }
        } catch (e) {
          console.error('[CART SYNC - REGISTER] ERROR during parse/sync:', e.message);
          console.error('[CART SYNC - REGISTER] Stack:', e.stack);
        }
      } else {
        console.log('[CART SYNC - REGISTER] No cartData to sync');
      }
      
      console.log('[CART SYNC - REGISTER] ========== SYNC COMPLETE ==========');

      // Check if there's a redirect parameter from the form
      const redirectTo = redirect === 'cart' ? '/cart' : '/profile';
      return res.redirect(redirectTo);
    } catch (err) {
      res.render('register', {
        title: 'JC Rentals - Create Account',
        message: 'Error creating account. Please try again.',
        redirect: redirect || '',
        isLoggedIn: false
      });
    }
  },

  /**
   * Handle logout
   */
  logout: (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).send('Could not log out');
      }
      res.redirect('/');
    });
  },

  /**
   * API endpoint - Check if email exists
   */
  checkEmail: async (req, res) => {
    const { email } = req.query;
    if (!email) return res.json({ exists: false });
    try {
      const user = await User.findByEmail(email);
      res.json({ exists: !!user });
    } catch {
      res.json({ exists: false, error: true });
    }
  }
};

module.exports = AuthController;
