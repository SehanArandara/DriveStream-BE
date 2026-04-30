require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User.model');

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB for seeding...');

    const adminEmail = 'admin@drivestream.lk';

    // Check if admin already exists
    let admin = await User.findOne({ email: adminEmail });
    if (admin) {
      console.log('⚠️ Admin already exists. Upgrading to Super Admin status...');
      admin.isSuperAdmin = true;
      await admin.save();
      console.log('✅ Existing admin upgraded to Super Admin.');
      process.exit(0);
    }

    // Create the First Manager
    const newAdmin = await User.create({
      name: 'System Manager',
      email: adminEmail,
      password: '123456', // Change this after login!
      phone: '+94000000000',
      role: 'admin',
      isVerified: true,
      isActive: true,
      isSuperAdmin: true
    });

    console.log(`\n🚀 SUCCESS: First Manager Created!`);
    console.log(`Email: ${newAdmin.email}`);
    console.log(`Password: adminpassword123`);
    console.log(`\nPlease login with these credentials to start managing staff.\n`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding admin:', err.message);
    process.exit(1);
  }
};

seedAdmin();
