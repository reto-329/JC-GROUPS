const mongoose = require('mongoose');

/**
 * Order Schema
 * Defines rental orders/transactions
 */
const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    sparse: true,
    default: null
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  items: [{
    equipmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Equipment'
    },
    equipmentName: String,
    equipmentImage: String,
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    dailyRate: Number,
    subtotal: Number,
    startDate: Date,
    endDate: Date
  }],
  rentalPeriod: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    days: Number
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'active', 'completed', 'cancelled'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'partial', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['credit_card', 'debit_card', 'bank_transfer', 'cash'],
    default: null
  },
  monerisCheckoutId: {
    type: String,
    default: null
  },
  deliveryAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String
  },
  billingAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String
  },
  notes: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

/**
 * Generate unique order number
 */
orderSchema.pre('save', async function() {
  try {
    if (!this.orderNumber) {
      console.log('[ORDER MODEL] Pre-save hook: orderNumber not set, generating...');
      const count = await this.constructor.countDocuments();
      const timestamp = Date.now().toString().slice(-6);
      this.orderNumber = `ORD-${timestamp}-${count + 1}`;
      console.log('[ORDER MODEL] Generated orderNumber:', this.orderNumber);
    } else {
      console.log('[ORDER MODEL] Pre-save hook: orderNumber already set:', this.orderNumber);
    }
  } catch (err) {
    console.error('[ORDER MODEL] Pre-save hook error:', err.message);
    throw err;
  }
});

/**
 * Calculate rental days
 */
orderSchema.methods.calculateDays = function() {
  const timeDiff = this.rentalPeriod.endDate - this.rentalPeriod.startDate;
  this.rentalPeriod.days = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  return this.rentalPeriod.days;
};

/**
 * Check if order is active
 */
orderSchema.methods.isActive = function() {
  return this.status === 'active';
};

/**
 * Cancel order
 */
orderSchema.methods.cancel = function() {
  this.status = 'cancelled';
  return this.save();
};

/**
 * Complete order
 */
orderSchema.methods.complete = function() {
  this.status = 'completed';
  return this.save();
};

/**
 * Find by user ID
 */
orderSchema.statics.findByUserId = function(userId) {
  return this.find({ userId }).populate('userId').populate('items.equipmentId');
};

/**
 * Find active orders
 */
orderSchema.statics.findActive = function() {
  return this.find({ status: 'active' }).populate('userId').populate('items.equipmentId');
};

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
