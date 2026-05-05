const { User, Order, Cart, Equipment, ServiceArea, EquipmentModel } = require('../db');
const { createCheckoutSession } = require('../services/monerisService');

/**
 * Checkout Controller
 * Handles checkout page rendering and order processing
 */
const CheckoutController = {
  /**
   * Get checkout page
   * Displays cart summary and order form
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

      // Get allowed service areas
      const serviceAreas = await ServiceArea.find({ isActive: true });

      // Calculate totals
      const subtotal = cart.items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
      const tax = subtotal * 0.13; // 13% HST
      const deliveryFee = 0; // Start at 0, updated when user selects area
      const total = subtotal + tax + deliveryFee;

      res.render('checkout', {
        title: 'Checkout - JC Equipment Rentals',
        cartItems: cart.items,
        user: user,
        subtotal: subtotal.toFixed(2),
        tax: tax.toFixed(2),
        deliveryFee: deliveryFee.toFixed(2),
        total: total.toFixed(2),
        serviceAreas: serviceAreas
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
   * Process order placement
   * Moneris hosted checkout payment flow
   */
  postPayment: async (req, res) => {
    let savedOrder = null;
    try {
      const userId = req.session.userId;
      const { deliveryAddress, billingAddress } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const normalizedPostalCode = deliveryAddress.zipCode.toString().replace(/[^a-z0-9]/gi, '').toUpperCase();
      let serviceArea = await ServiceArea.findOne({
        normalizedCode: normalizedPostalCode,
        isActive: true
      });

      if (!serviceArea) {
        const allAreas = await ServiceArea.find({ isActive: true });
        serviceArea = allAreas.find(area => {
          const areaNormalized = area.postalCode.toString().replace(/[^a-z0-9]/gi, '').toUpperCase();
          return areaNormalized === normalizedPostalCode;
        });
      }

      if (!serviceArea) {
        const availableAreas = await ServiceArea.find({ isActive: true });
        const postalCodes = availableAreas.map(a => `${a.postalCode} (${a.city})`).join(', ');

        return res.status(400).json({
          success: false,
          message: `Postal code ${deliveryAddress.zipCode} is not in our delivery area. Available areas: ${postalCodes}`
        });
      }

      const cart = await Cart.findOne({ userId });
      if (!cart || !cart.items || cart.items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Cart is empty'
        });
      }

      const subtotal = cart.items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
      const tax = subtotal * 0.13;
      const deliveryFee = serviceArea.deliveryFee;
      const total = subtotal + tax + deliveryFee;
      const user = await User.findById(userId);

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
        status: 'pending',
        paymentStatus: 'pending',
        paymentMethod: 'credit_card',
        deliveryAddress: deliveryAddress,
        billingAddress: billingAddress || deliveryAddress,
        notes: 'Awaiting Moneris payment authorization'
      });

      const savedOrder = await order.save();

      const baseAppUrl = (process.env.APP_URL || `http://localhost:${process.env.PORT || 8000}`).replace(/\/$/, '');
      const returnUrl = `${baseAppUrl}/checkout/moneris-return?orderId=${savedOrder._id}`;
      const cancelUrl = `${returnUrl}&status=cancelled`;

      const checkoutSession = await createCheckoutSession({
        amount: total,
        orderId: savedOrder._id.toString(),
        orderNumber: savedOrder.orderNumber,
        returnUrl,
        cancelUrl,
        billingAddress: billingAddress || deliveryAddress,
        shippingAddress: deliveryAddress,
        email: user?.email || '',
        phone: user?.phone || ''
      });

      savedOrder.monerisCheckoutId = checkoutSession.ticket;
      await savedOrder.save();

      res.json({
        success: true,
        checkoutUrl: checkoutSession.checkoutUrl,
        orderId: savedOrder._id,
        orderNumber: savedOrder.orderNumber
      });

    } catch (err) {
      console.error('Order processing error:', err);
      if (savedOrder && savedOrder._id) {
        try {
          await Order.deleteOne({ _id: savedOrder._id });
        } catch (cleanupErr) {
          console.error('Failed to cleanup incomplete order:', cleanupErr);
        }
      }
      res.status(500).json({
        success: false,
        message: 'Error processing order: ' + err.message
      });
    }
  },

  handleMonerisReturn: async (req, res) => {
    try {
      const { orderId, status, ticket } = req.query;
      const userId = req.session.userId;

      if (!userId) {
        return res.redirect('/login?redirect=/checkout');
      }

      if (!orderId) {
        return res.status(400).render('checkout-error', {
          title: 'Payment Error',
          message: 'Missing payment information from Moneris.',
          returnUrl: '/checkout'
        });
      }

      const order = await Order.findById(orderId);
      if (!order || order.userId.toString() !== userId.toString()) {
        return res.status(404).render('checkout-error', {
          title: 'Order Not Found',
          message: 'Unable to locate the order associated with this payment.',
          returnUrl: '/checkout'
        });
      }

      if (order.paymentStatus === 'paid') {
        return res.redirect(`/checkout/confirmation/${order._id}`);
      }

      if (status !== 'cancelled') {
        // Assume payment succeeded
        order.paymentStatus = 'paid';
        order.status = 'confirmed';
        order.notes = 'Paid via Moneris Checkout.';
        if (ticket) {
          order.monerisCheckoutId = ticket;
        }
        await order.save();

        for (const item of order.items) {
          await EquipmentModel.findByIdAndUpdate(
            item.equipmentId,
            { $inc: { quantityAvailable: -item.quantity } },
            { returnDocument: 'after' }
          );
        }

        await Cart.deleteOne({ userId });
        req.session.cartSynced = false;

        return res.redirect(`/checkout/confirmation/${order._id}`);
      } else {
        // cancelled
        const message = 'Payment was cancelled. Please try again.';
        return res.status(400).render('checkout-error', {
          title: 'Payment Failed',
          message,
          returnUrl: '/checkout'
        });
      }
    } catch (err) {
      console.error('Moneris return error:', err);
      res.status(500).render('checkout-error', {
        title: 'Payment Error',
        message: 'Unable to verify payment status. Please contact support or try again.',
        returnUrl: '/checkout'
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
        title: 'Order Confirmation - JC Equipment Rentals',
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

module.exports = CheckoutController;
