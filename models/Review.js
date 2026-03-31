const mongoose = require('mongoose');

/**
 * Review Schema
 * Defines reviews for equipment
 */
const reviewSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  equipmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Equipment',
    required: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  title: {
    type: String,
    required: [true, 'Review title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  comment: {
    type: String,
    required: [true, 'Review comment is required'],
    trim: true,
    maxlength: [1000, 'Comment cannot exceed 1000 characters']
  },
  verified: {
    type: Boolean,
    default: false
  },
  helpful: {
    type: Number,
    default: 0
  },
  isApproved: {
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
 * Prevent duplicate reviews from same user for same equipment
 */
reviewSchema.index({ userId: 1, equipmentId: 1 }, { unique: true });

/**
 * Find reviews by equipment
 */
reviewSchema.statics.findByEquipmentId = function(equipmentId) {
  return this.find({ equipmentId, isApproved: true })
    .populate('userId', 'firstName lastName profileImage')
    .sort({ createdAt: -1 });
};

/**
 * Find reviews by user
 */
reviewSchema.statics.findByUserId = function(userId) {
  return this.find({ userId })
    .populate('equipmentId', 'name')
    .sort({ createdAt: -1 });
};

/**
 * Calculate average rating for equipment
 */
reviewSchema.statics.getAverageRating = function(equipmentId) {
  return this.aggregate([
    { $match: { equipmentId: mongoose.Types.ObjectId(equipmentId), isApproved: true } },
    { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
  ]);
};

/**
 * Get reviews pending approval
 */
reviewSchema.statics.findPending = function() {
  return this.find({ isApproved: false })
    .populate('userId', 'firstName lastName email')
    .populate('equipmentId', 'name')
    .sort({ createdAt: -1 });
};

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
