const { User, Order, Cart, Equipment } = require('../db');
const axios = require('axios');
const crypto = require('crypto');

/**
 * Checkout Controller
 * Handles checkout page rendering and payment processing with Moneris
 */
const CheckoutController = {
  /**
   * Get checkout page
   * Displays cart summary and payment form
   */
  getCheckout: async (req, res) => {
    try {
      const userId = req.session.userId;
      
      if (!userId) {
        return res.redirect('/login?redirect=checkout');
      }

      // Get user cart
      const cart = await Cart.findOne({ userId });
      
      if (!cart || !cart.items || cart.items.length === 0) {
        return res.redirect('/cart');
      }

      // Get user details
      const user = await User.findById(userId);

      // Calculate totals
      const subtotal = cart.items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
      const tax = subtotal * 0.13; // 13% HST
      const deliveryFee = 15.00; // Fixed delivery fee
      const total = subtotal + tax + deliveryFee;

      // Generate Moneris transaction data
      const orderId = `ORD-${Date.now()}`;
      const sessionId = crypto.randomBytes(16).toString('hex');

      res.render('checkout', {
        title: 'Checkout - JC Rentals',
        cartItems: cart.items,
        user: user,
        subtotal: subtotal.toFixed(2),
        tax: tax.toFixed(2),
        deliveryFee: deliveryFee.toFixed(2),
        total: total.toFixed(2),
        orderId: orderId,
        sessionId: sessionId,
        // Moneris test credentials - CHANGE TO PRODUCTION
        monerisStoreId: process.env.MONERIS_STORE_ID || 'store1',
        monerisApiToken: process.env.MONERIS_API_TOKEN || 'yesguy',
        monerisEnvironment: process.env.MONERIS_ENV || 'test'
      });
    } catch (err) {
      console.error('Checkout page error:', err);
      res.status(500).render('error', { 
        title: 'Error',
        message: 'Error loading checkout page' 
      });
    }
  },

  /**
   * Process payment with Moneris
   * Handles the payment request and creates order on success
   */
  postPayment: async (req, res) => {
    try {
      const userId = req.session.userId;
      const { cardNumber, expiryMonth, expiryYear, cvv, deliveryAddress } = req.body;

      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          message: 'User not authenticated' 
        });
      }

      // Validate postal code - only K0L 1W0 service area
      const ALLOWED_POSTAL_CODE = 'K0L1W0';
      const normalizedPostalCode = deliveryAddress.zipCode.replace(/\s/g, '').toUpperCase();
      
      if (normalizedPostalCode !== ALLOWED_POSTAL_CODE) {
        return res.status(400).json({
          success: false,
          message: `We currently only deliver to postal code K0L 1W0. Your postal code (${deliveryAddress.zipCode}) is outside our service area.`
        });
      }

      // Get cart
      const cart = await Cart.findOne({ userId });
      
      if (!cart || !cart.items || cart.items.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Cart is empty' 
        });
      }

      // Calculate total
      const subtotal = cart.items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
      const tax = subtotal * 0.13;
      const deliveryFee = 15.00;
      const total = subtotal + tax + deliveryFee;

      // Get user
      const user = await User.findById(userId);

      // Prepare Moneris payment data
      const paymentData = {
        store_id: process.env.MONERIS_STORE_ID || 'store1',
        api_token: process.env.MONERIS_API_TOKEN || 'yesguy',
        processing_country_code: 'CA',
        type: 'purchase',
        pan: cardNumber.replace(/\s/g, ''),
        expdate: `${expiryMonth}${expiryYear.slice(-2)}`,
        cvd_value: cvv,
        cvd_indicator: '1',
        amount: Math.round(total * 100), // Amount in cents
        order_id: `ORD-${Date.now()}`,
        cust_id: userId.toString(),
        email: user.email,
        crypt_type: '7'
      };

      // Send payment to Moneris
      const monerisResponse = await processMonerisPayment(paymentData);

      if (!monerisResponse.success) {
        return res.status(400).json({
          success: false,
          message: monerisResponse.message || 'Payment failed'
        });
      }

      // Create order from cart
      const startDate = cart.items[0]?.startDate;
      const endDate = cart.items[0]?.endDate;
      const rentalDays = startDate && endDate
        ? Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24))
        : 0;

      const order = new Order({
        userId: userId,
        items: cart.items,
        rentalPeriod: {
          startDate,
          endDate,
          days: rentalDays
        },
        totalAmount: total,
        status: 'confirmed',
        paymentStatus: 'paid',
        paymentMethod: 'credit_card',
        deliveryAddress: deliveryAddress,
        notes: `Payment confirmed with Moneris. Reference: ${monerisResponse.transactionId}`
      });

      const savedOrder = await order.save();

      // Clear the cart after successful order
      await Cart.deleteOne({ userId });

      // Clear session cart
      req.session.cartSynced = false;

      res.json({
        success: true,
        message: 'Payment successful',
        orderId: savedOrder._id,
        orderNumber: savedOrder.orderNumber,
        transactionId: monerisResponse.transactionId
      });

    } catch (err) {
      console.error('Payment processing error:', err);
      res.status(500).json({
        success: false,
        message: 'Error processing payment: ' + err.message
      });
    }
  },

  /**
   * Get order confirmation page
   */
  getConfirmation: async (req, res) => {
    try {
      const { orderId } = req.params;
      const userId = req.session.userId;

      if (!userId) {
        return res.redirect('/login');
      }

      const order = await Order.findById(orderId).populate('items.equipmentId');

      if (!order || order.userId.toString() !== userId) {
        return res.status(404).render('error', {
          title: 'Order Not Found',
          message: 'The order you are looking for does not exist.'
        });
      }

      res.render('order-confirmation', {
        title: 'Order Confirmation - JC Rentals',
        order: order
      });
    } catch (err) {
      console.error('Confirmation page error:', err);
      res.status(500).render('error', {
        title: 'Error',
        message: 'Error loading confirmation page'
      });
    }
  }
};

/**
 * Process payment with Moneris API
 * For this implementation, we're using a simulated response
 * In production, integrate with actual Moneris API
 */
async function processMonerisPayment(paymentData) {
  try {
    console.log('[MONERIS PAYMENT] Processing payment:', {
      orderId: paymentData.order_id,
      amount: paymentData.amount / 100,
      customerId: paymentData.cust_id
    });

    // For development/testing with Moneris test environment
    if (process.env.MONERIS_ENV === 'test' || !process.env.MONERIS_ENV) {
      // Simulate successful payment in test mode
      // Valid test card: 4111111111111111
      if (paymentData.pan === '4111111111111111' || paymentData.pan === '4222222222222220') {
        console.log('[MONERIS PAYMENT] TEST MODE - Simulating successful payment');
        return {
          success: true,
          transactionId: `TXN-${Date.now()}`,
          message: 'Payment processed successfully'
        };
      } else {
        console.log('[MONERIS PAYMENT] TEST MODE - Simulating failed payment');
        return {
          success: false,
          message: 'Test card declined. Use 4111111111111111 or 4222222222222220'
        };
      }
    }

    // Production: Use actual Moneris API
    // Below is a placeholder for actual Moneris API integration
    const monerisUrl = 'https://chk.moneris.com/chk/purchase.php';

    const response = await axios.post(monerisUrl, paymentData, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    // Parse Moneris response
    if (response.data && response.data.response === '1') {
      return {
        success: true,
        transactionId: response.data.trans_id,
        message: 'Payment processed successfully'
      };
    } else {
      return {
        success: false,
        message: response.data?.message || 'Payment declined'
      };
    }

  } catch (err) {
    console.error('[MONERIS PAYMENT] Error:', err.message);
    return {
      success: false,
      message: 'Payment service error: ' + err.message
    };
  }
}

module.exports = CheckoutController;
