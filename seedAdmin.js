require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('./models/Admin');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/jcrentals';

async function seedAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB\n');

    // Check if admin already exists
    const existing = await Admin.findOne({ email: 'admin@jcrentals.com' });
    if (existing) {
      console.log('■ Admin already exists:');
      console.log('  Email:', existing.email);
      console.log('  Name:', existing.firstName, existing.lastName);
      console.log('  Role:', existing.role);
      console.log('\nTest the login:');
      console.log('  Email: admin@jcrentals.com');
      console.log('  Password: Admin@1234');
      process.exit(0);
    }

    // Delete all admins first (fresh start)
    await Admin.deleteMany({});
    console.log('■ Cleared existing admins\n');

    // Create new admin
    const admin = new Admin({
      email: 'admin@jcrentals.com',
      password: 'Admin@1234',
      firstName: 'JC',
      lastName: 'Admin',
      role: 'superadmin',
      permissions: { users: true, equipment: true, orders: true, analytics: true }
    });

    const savedAdmin = await admin.save();
    console.log('✓ Admin created successfully!\n');
    console.log('  Email: admin@jcrentals.com');
    console.log('  Password: Admin@1234');
    console.log('  Name:', savedAdmin.firstName, savedAdmin.lastName);
    console.log('  Role:', savedAdmin.role);
    console.log('  ID:', savedAdmin._id);
    
    // Verify we can find it
    const verification = await Admin.findOne({ email: 'admin@jcrentals.com' }).select('+password');
    if (verification && verification.password) {
      console.log('\n✓ Password stored correctly');
    } else {
      console.log('\n✗ ERROR: Password not found!');
    }

    process.exit(0);
  } catch (err) {
    console.error('✗ Error:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

seedAdmin();
