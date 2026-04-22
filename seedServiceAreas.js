require('dotenv').config();
const mongoose = require('mongoose');
const ServiceArea = require('./models/ServiceArea');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/jcrentals';

/**
 * Seed Service Areas
 * Initializes the database with default service areas
 */
async function seedServiceAreas() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB\n');

    // Check if K0L 1W0 already exists
    const existing = await ServiceArea.findOne({ postalCode: 'K0L1W0' });
    if (existing) {
      console.log('✓ Default service area already exists:');
      console.log('  Postal Code:', existing.postalCode);
      console.log('  City:', existing.city);
      console.log('  Province:', existing.province);
      console.log('  Delivery Fee: $' + existing.deliveryFee.toFixed(2));
      console.log('  Status:', existing.isActive ? 'Active' : 'Inactive');
      
      // Suggest adding more service areas via admin panel
      console.log('\n💡 To add more service areas:');
      console.log('  1. Log in to admin panel at /admin/login');
      console.log('  2. Go to "Service Areas" section');
      console.log('  3. Click "Add Service Area" button');
      
      process.exit(0);
    }

    // Create default service area
    console.log('Creating default service area...\n');
    const serviceArea = new ServiceArea({
      postalCode: 'K0L 1W0',
      city: 'Plevna',
      province: 'ON',
      deliveryFee: 15.00,
      isActive: true
    });

    const saved = await serviceArea.save();
    console.log('✓ Service area created successfully!\n');
    console.log('  Postal Code:', saved.postalCode);
    console.log('  City:', saved.city);
    console.log('  Province:', saved.province);
    console.log('  Delivery Fee: $' + saved.deliveryFee.toFixed(2));
    console.log('  Status:', saved.isActive ? 'Active' : 'Inactive');
    console.log('  ID:', saved._id);
    
    console.log('\n💡 Next steps:');
    console.log('  1. Restart your application');
    console.log('  2. Log in to admin panel to add more service areas');
    console.log('  3. Test checkout with the postal code K0L 1W0');

    process.exit(0);
  } catch (err) {
    console.error('✗ Error seeding service areas:');
    console.error(err.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedServiceAreas();
}

module.exports = seedServiceAreas;
