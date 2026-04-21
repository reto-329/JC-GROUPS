/**
 * Setup TTL index for MongoDB sessions collection
 * Run this once to ensure automatic cleanup of expired sessions
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

async function setupSessionTTL() {
  try {
    console.log('🔧 Setting up TTL index for sessions collection...');
    await mongoose.connect(MONGODB_URI);
    
    const db = mongoose.connection.db;
    const collection = db.collection('sessions');
    
    // Create TTL index on 'expires' field
    // MongoDB will automatically delete documents 0 seconds after the 'expires' time
    await collection.createIndex({ expires: 1 }, { expireAfterSeconds: 0 });
    
    console.log('✅ TTL index created successfully!');
    
    // Check for existing expired sessions
    const expiredCount = await collection.countDocuments({
      expires: { $lt: new Date() }
    });
    
    if (expiredCount > 0) {
      console.log(`⚠️  Found ${expiredCount} expired sessions in the database`);
      console.log('💡 These will be automatically deleted by MongoDB within the next minute.');
    } else {
      console.log('✅ No expired sessions found.');
    }
    
    // Show collection info
    const stats = await db.collection('sessions').stats();
    console.log(`\n📊 Sessions collection stats:`);
    console.log(`   - Document count: ${stats.count}`);
    console.log(`   - Avg doc size: ${Math.round(stats.avgObjSize)} bytes`);
    
    // List all indexes
    const indexes = await collection.getIndexes();
    console.log(`\n📑 Indexes on sessions collection:`);
    Object.entries(indexes).forEach(([name, spec]) => {
      console.log(`   - ${name}: ${JSON.stringify(spec)}`);
    });
    
    await mongoose.disconnect();
    console.log('\n✅ Setup complete! Sessions will now auto-expire.');
    
  } catch (error) {
    console.error('❌ Error setting up TTL index:', error.message);
    process.exit(1);
  }
}

setupSessionTTL();
