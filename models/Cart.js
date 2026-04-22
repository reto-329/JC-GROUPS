const mongoose = require('mongoose');

/**
 * Cart Schema
 * Stores cart items before checkout
 */
const cartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
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
    endDate: Date,
    postalCode: String
  }],
  totalAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

/**
 * Calculate total amount
 */
cartSchema.methods.calculateTotal = function() {
  this.totalAmount = this.items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
  return this.totalAmount;
};

/**
 * Add item to cart
 */
cartSchema.methods.addItem = function(item) {
  // Check if item already exists
  const existingIndex = this.items.findIndex(i => 
    i.equipmentId?.toString() === item.equipmentId?.toString() &&
    i.startDate?.toISOString() === new Date(item.startDate).toISOString()
  );
  
  if (existingIndex >= 0) {
    // Update quantity if same equipment and dates
    this.items[existingIndex].quantity += item.quantity;
    this.items[existingIndex].subtotal += item.subtotal;
  } else {
    // Add new item
    this.items.push(item);
  }
  
  this.calculateTotal();
  return this;
};

/**
 * Remove item from cart
 */
cartSchema.methods.removeItem = function(index) {
  if (index >= 0 && index < this.items.length) {
    this.items.splice(index, 1);
    this.calculateTotal();
  }
  return this;
};

/**
 * Clear all items
 */
cartSchema.methods.clear = function() {
  this.items = [];
  this.totalAmount = 0;
  return this;
};

/**
 * Find by user ID
 */
cartSchema.statics.findByUserId = function(userId) {
  return this.findOne({ userId });
};

/**
 * Get or create cart for user
 */
cartSchema.statics.getOrCreate = async function(userId) {
  let cart = await this.findOne({ userId });
  if (!cart) {
    cart = new this({ userId, items: [], totalAmount: 0 });
  }
  return cart;
};

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;
