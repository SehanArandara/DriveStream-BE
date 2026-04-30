require('dotenv').config();
const mongoose = require('mongoose');

// Import models
const Booking = require('./src/models/Booking.model');
const Job = require('./src/models/Job.model');
const Invoice = require('./src/models/Invoice.model');
const Vehicle = require('./src/models/Vehicle.model');

const cleanDatabase = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected successfully.\n');

    console.log('⚠️ WARNING: Wiping all customer transactional data (Vehicles, Bookings, Jobs, Invoices)...');
    
    await Booking.deleteMany({});
    console.log('🗑️  All Bookings deleted.');

    await Job.deleteMany({});
    console.log('🗑️  All Jobs deleted.');

    await Invoice.deleteMany({});
    console.log('🗑️  All Invoices deleted.');

    await Vehicle.deleteMany({});
    console.log('🗑️  All Vehicles deleted.');

    console.log('\n✨ Database clean up complete! All vehicle and booking data has been reset.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error cleaning database:', error);
    process.exit(1);
  }
};

cleanDatabase();
