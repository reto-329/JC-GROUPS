const mongoose = require('mongoose');

/**
 * Equipment Schema
 * Defines rental equipment items
 */
const equipmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Equipment name is required'],
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['Tools', 'Machinery', 'Vehicles', 'Safety', 'Other']
  },
  dailyRate: {
    type: Number,
    required: [true, 'Daily rate is required'],
    min: [0, 'Price cannot be negative']
  },
  weeklyRate: {
    type: Number,
    default: 0
  },
  monthlyRate: {
    type: Number,
    default: 0
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity cannot be negative']
  },
  quantityAvailable: {
    type: Number,
    required: true
  },
  image: {
    type: String,
    default: null
  },
  specifications: {
    type: Map,
    of: String,
    default: new Map()
  },
  manufacturer: {
    type: String,
    default: ''
  },
  model: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
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
 * Get available quantity
 */
equipmentSchema.methods.getAvailableQuantity = function() {
  return this.quantityAvailable;
};

/**
 * Reduce available quantity
 */
equipmentSchema.methods.reduceAvailability = function(quantity) {
  this.quantityAvailable = Math.max(0, this.quantityAvailable - quantity);
  return this.save();
};

/**
 * Increase available quantity
 */
equipmentSchema.methods.increaseAvailability = function(quantity) {
  this.quantityAvailable = Math.min(this.quantity, this.quantityAvailable + quantity);
  return this.save();
};

/**
 * Find by category
 */
equipmentSchema.statics.findByCategory = function(category) {
  return this.find({ category, isActive: true });
};

/**
 * Find active equipment
 */
equipmentSchema.statics.findActive = function() {
  return this.find({ isActive: true });
};

const Equipment = mongoose.model('Equipment', equipmentSchema);

module.exports = Equipment;
