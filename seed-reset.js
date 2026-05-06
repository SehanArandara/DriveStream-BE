require('dotenv').config();
const mongoose = require('mongoose');

// Import models
const Booking = require('./src/models/Booking.model');
const Job = require('./src/models/Job.model');
const Invoice = require('./src/models/Invoice.model');
const Vehicle = require('./src/models/Vehicle.model');
const Payment = require('./src/models/Payment.model');
const Notification = require('./src/models/Notification.model');

const cleanDatabase = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected successfully.\n');

    console.log('⚠️ WARNING: Wiping all customer transactional data (Vehicles, Bookings, Jobs, Invoices, Payments, Notifications)...');
    
    await Booking.deleteMany({});
    console.log('🗑️  All Bookings (Appointments) deleted.');

    await Job.deleteMany({});
    console.log('🗑️  All Jobs deleted.');

    await Invoice.deleteMany({});
    console.log('🗑️  All Invoices deleted.');

    await Vehicle.deleteMany({});
    console.log('🗑️  All Vehicles deleted.');

    await Payment.deleteMany({});
    console.log('🗑️  All Payments deleted.');

    await Notification.deleteMany({});
    console.log('🗑️  All Notifications deleted.');

    console.log('\n✨ Database clean up complete!');
    console.log('👉 Kept: Users, Services, and Vehicle Types (System Metadata).');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error cleaning database:', error);
    process.exit(1);
  }
};

cleanDatabase();
