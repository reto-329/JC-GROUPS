# Data Models Documentation

## Models Overview

JC Rentals uses Mongoose models to define the database schema and structure. Each model represents a collection in MongoDB with validation, methods, and static functions.

## Available Models

### 1. **User Model**
Stores user account information and authentication data.

**Location**: `models/User.js`

**Schema Fields**:
```javascript
{
  email: String (required, unique, lowercase),
  password: String (required, hashed),
  firstName: String (required),
  lastName: String (required),
  phone: String,
  address: String,
  city: String,
  state: String,
  zipCode: String,
  profileImage: String,
  isActive: Boolean (default: true),
  role: String (enum: ['user', 'admin']),
  createdAt: Date,
  updatedAt: Date
}
```

**Instance Methods**:
```javascript
user.comparePassword(plainPassword)      // Compare with hashed password
user.toPublicJSON()                      // Get user data without password
user.getFullName()                       // Return "First Last"
```

**Static Methods**:
```javascript
User.findByEmail(email)                  // Find user by email
```

**Usage**:
```javascript
const { User } = require('../models');

// Create user (auto-hashes password)
const user = new User({
  email: 'user@example.com',
  password: 'plaintext',
  firstName: 'John',
  lastName: 'Doe'
});
await user.save();

// Find user
const user = await User.findById(id);
const user = await User.findByEmail('user@example.com');

// Compare password
if (user.comparePassword('plaintext')) {
  console.log('Password matches!');
}
```

### 2. **Equipment Model**
Defines rental equipment items available for rent.

**Location**: `models/Equipment.js`

**Schema Fields**:
```javascript
{
  name: String (required),
  description: String,
  category: String (enum: ['Tools', 'Machinery', 'Vehicles', 'Safety', 'Other']),
  dailyRate: Number (required),
  weeklyRate: Number,
  monthlyRate: Number,
  quantity: Number (required),
  quantityAvailable: Number (required),
  image: String,
  specifications: Map<String, String>,
  manufacturer: String,
  model: String,
  isActive: Boolean (default: true),
  createdAt: Date,
  updatedAt: Date
}
```

**Instance Methods**:
```javascript
equipment.getAvailableQuantity()         // Get available items
equipment.reduceAvailability(quantity)   // Reduce availability when rented
equipment.increaseAvailability(quantity) // Increase when returned
```

**Static Methods**:
```javascript
Equipment.findByCategory(category)       // Find by category
Equipment.findActive()                   // Find all active equipment
```

**Usage**:
```javascript
const { Equipment } = require('../models');

// Create equipment
const item = new Equipment({
  name: 'Power Drill',
  category: 'Tools',
  dailyRate: 25,
  quantity: 10,
  quantityAvailable: 10
});
await item.save();

// Find active equipment
const tools = await Equipment.findActive();

// Update availability when renting
await equipment.reduceAvailability(2);

// When returning
await equipment.increaseAvailability(2);
```

### 3. **Order Model**
Tracks rental orders and transactions.

**Location**: `models/Order.js`

**Schema Fields**:
```javascript
{
  orderNumber: String (unique, auto-generated),
  userId: ObjectId (ref: 'User'),
  items: [{
    equipmentId: ObjectId,
    equipmentName: String,
    quantity: Number,
    dailyRate: Number,
    subtotal: Number
  }],
  rentalPeriod: {
    startDate: Date,
    endDate: Date,
    days: Number
  },
  totalAmount: Number (required),
  status: String (enum: ['pending', 'confirmed', 'active', 'completed', 'cancelled']),
  paymentStatus: String (enum: ['pending', 'paid', 'partial', 'refunded']),
  paymentMethod: String (enum: ['credit_card', 'debit_card', 'bank_transfer', 'cash']),
  deliveryAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String
  },
  notes: String,
  createdAt: Date,
  updatedAt: Date
}
```

**Instance Methods**:
```javascript
order.calculateDays()                    // Calculate rental period days
order.isActive()                         // Check if order is active
order.cancel()                           // Cancel order
order.complete()                         // Mark as completed
```

**Static Methods**:
```javascript
Order.findByUserId(userId)               // Find user's orders
Order.findActive()                       // Find active rentals
```

**Usage**:
```javascript
const { Order } = require('../models');

// Create order
const order = new Order({
  userId: userId,
  items: [{
    equipmentId: equipmentId,
    equipmentName: 'Power Drill',
    quantity: 2,
    dailyRate: 25,
    subtotal: 50
  }],
  rentalPeriod: {
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  },
  totalAmount: 350
});
await order.save();

// Find user's orders
const orders = await Order.findByUserId(userId);

// Calculate days
const days = order.calculateDays();
```

### 4. **Review Model**
Stores equipment reviews and ratings.

**Location**: `models/Review.js`

**Schema Fields**:
```javascript
{
  userId: ObjectId (ref: 'User'),
  equipmentId: ObjectId (ref: 'Equipment'),
  orderId: ObjectId (ref: 'Order'),
  rating: Number (1-5, required),
  title: String (required, max 100),
  comment: String (required, max 1000),
  verified: Boolean (default: false),
  helpful: Number (default: 0),
  isApproved: Boolean (default: true),
  createdAt: Date,
  updatedAt: Date
}
```

**Static Methods**:
```javascript
Review.findByEquipmentId(equipmentId)    // Get equipment reviews
Review.findByUserId(userId)              // Get user's reviews
Review.getAverageRating(equipmentId)     // Get average rating
Review.findPending()                     // Get reviews pending approval
```

**Usage**:
```javascript
const { Review } = require('../models');

// Create review
const review = new Review({
  userId: userId,
  equipmentId: equipmentId,
  orderId: orderId,
  rating: 5,
  title: 'Great equipment!',
  comment: 'Very good condition and easy to use.'
});
await review.save();

// Get equipment reviews
const reviews = await Review.findByEquipmentId(equipmentId);

// Get average rating
const stats = await Review.getAverageRating(equipmentId);
console.log(stats[0].avgRating); // 4.5
```

## Importing Models

### Single Model Import
```javascript
const User = require('./models/User');
const { User } = require('./models');
```

### Multiple Models Import
```javascript
const { User, Equipment, Order, Review } = require('./models');
```

## Model Relationships

```
User
  ├── has many Orders
  └── has many Reviews

Equipment
  ├── has many Orders (via items)
  └── has many Reviews

Order
  ├── belongs to User
  └── has many items (Equipment)

Review
  ├── belongs to User
  ├── belongs to Equipment
  └── belongs to Order
```

## Using in Controllers

```javascript
const { User, Equipment, Order, Review } = require('../models');

// In controller method
async function getEquipmentDetails(req, res) {
  const { equipmentId } = req.params;
  
  // Find equipment with reviews
  const equipment = await Equipment.findById(equipmentId);
  const reviews = await Review.findByEquipmentId(equipmentId);
  const stats = await Review.getAverageRating(equipmentId);
  
  res.render('equipment-detail', {
    equipment,
    reviews,
    averageRating: stats[0]?.avgRating || 0
  });
}
```

## Validation

All models include built-in validation:
- **Required fields**: Must be provided
- **Unique fields**: No duplicates allowed (email)
- **Enum fields**: Only specified values allowed
- **Min/Max**: Numeric constraints
- **Pattern matching**: Email format validation

Validation errors include helpful messages:
```javascript
try {
  await user.save();
} catch (error) {
  console.error(error.message);
  // "User validation failed: email: Please provide a valid email"
}
```

## Timestamps

All models automatically track creation and updates:
- `createdAt` - Set when document is created
- `updatedAt` - Updated on each save

Enable with: `{ timestamps: true }` in schema options.

## Indexing

Models include indexes for performance:
- User: email (searched frequently)
- Order: userId (filtered by user)
- Review: userId + equipmentId (unique constraint)

## Best Practices

1. **Always validate input** before creating models
2. **Use model methods** instead of raw queries when possible
3. **Populate references** when needed for nested data
4. **Handle errors** with try-catch or callbacks
5. **Use transactions** for multi-document operations
6. **Cache frequently accessed data** (categories, top equipment)
7. **Paginate large result sets**
8. **Use lean() for read-only operations** (improves performance)

## Future Models

Consider adding:
- **Payment Model** - Detailed payment records
- **Invoice Model** - Generate invoices
- **Support Ticket Model** - Customer support
- **Feedback Model** - General feedback/suggestions
- **Notification Model** - User notifications
