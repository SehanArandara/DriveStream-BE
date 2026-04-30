require('dotenv').config();
const mongoose = require('mongoose');

const cleanIndexes = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB...');

    // Access the collection directly
    const collection = mongoose.connection.collection('vehicles');
    
    console.log('🔍 Current Indexes:', await collection.indexes());

    // Drop the problematic old index
    try {
      await collection.dropIndex('licensePlate_1');
      console.log('✅ Dropped obsolete index: licensePlate_1');
    } catch (e) {
      console.log('ℹ️ Index licensePlate_1 not found, skipping.');
    }

    try {
      await collection.dropIndex('chassisNumber_1');
      console.log('✅ Dropped chassisNumber_1 to reset it with sparse rule');
    } catch (e) {
      console.log('ℹ️ Index chassisNumber_1 not found, skipping.');
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
};

cleanIndexes();
