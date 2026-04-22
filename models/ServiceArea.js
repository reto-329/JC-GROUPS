const mongoose = require('mongoose');

/**
 * Service Area Schema
 * Defines allowed delivery postal codes/service areas
 */
const serviceAreaSchema = new mongoose.Schema({
  postalCode: {
    type: String,
    required: [true, 'Postal code is required'],
    unique: true,
    uppercase: true,
    trim: true,
    validate: {
      validator: function(v) {
        // Accept formats: K0L1W0 or K0L 1W0
        return /^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(v.replace(/\s/g, ''));
      },
      message: 'Invalid Canadian postal code format (e.g., K0L 1W0)'
    }
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true
  },
  province: {
    type: String,
    required: [true, 'Province is required'],
    trim: true
  },
  deliveryFee: {
    type: Number,
    default: 15.00,
    min: 0
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
});

module.exports = mongoose.model('ServiceArea', serviceAreaSchema);
