const mongoose = require('mongoose');

/**
 * Service Area Schema
 * Defines allowed delivery postal codes/service areas
 */
const serviceAreaSchema = new mongoose.Schema({
  postalCode: {
    type: String,
    required: [true, 'Postal code is required'],
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return false;
        // Normalize for validation: remove non-alphanumeric and uppercase
        const norm = v.toString().replace(/[^a-z0-9]/gi, '').toUpperCase();

        // Canadian: A1A1A1 (with or without space)
        const canadian = /^[A-Z]\d[A-Z]\d[A-Z]\d$/;
        // US ZIP: 12345 or 12345-6789
        const usZip = /^\d{5}(-\d{4})?$/;
        // Generic fallback: alphanumeric between 3 and 10 chars
        const generic = /^[A-Z0-9]{3,10}$/;

        return canadian.test(norm) || usZip.test(v) || generic.test(norm);
      },
      message: 'Invalid postal code. Accepts Canadian (A1A 1A1), US ZIP (12345 or 12345-6789), or alphanumeric codes.'
    }
  },
  // Normalized variant used for lookups and uniqueness (stores uppercase alphanumerics only)
  normalizedCode: {
    type: String,
    required: false,
    unique: true,
    trim: true,
    index: true
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

// Preserve user-entered `postalCode` but compute `normalizedCode` before saving
serviceAreaSchema.pre('save', function() {
  if (this.postalCode) {
    this.normalizedCode = this.postalCode.toString().replace(/[^a-z0-9]/gi, '').toUpperCase();
  }
  this.updatedAt = new Date();
});

// Normalize postalCode for findOneAndUpdate / findByIdAndUpdate
// For findOneAndUpdate / findByIdAndUpdate: compute normalizedCode from provided postalCode
serviceAreaSchema.pre('findOneAndUpdate', function() {
  const update = this.getUpdate();
  if (!update) return;

  const setTarget = update.$set || update;

  if (setTarget.postalCode) {
    setTarget.normalizedCode = setTarget.postalCode.toString().replace(/[^a-z0-9]/gi, '').toUpperCase();
  }

  // Ensure updatedAt is set
  if (update.$set) {
    update.$set = { ...update.$set, updatedAt: new Date() };
  } else {
    update.updatedAt = new Date();
  }

  this.setUpdate(update);
});

module.exports = mongoose.model('ServiceArea', serviceAreaSchema);
