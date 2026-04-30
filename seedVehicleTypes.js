require('dotenv').config();
const mongoose = require('mongoose');
const VehicleType = require('./src/models/VehicleType.model');

const seedVehicleTypes = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const baseline = [
      { name: 'Car', description: 'Standard sedans and hatchbacks' },
      { name: 'SUV', description: 'Sport Utility Vehicles and Jeeps' },
      { name: 'Van', description: 'Multi-purpose vehicles and vans' },
      { name: 'Motorbike', description: 'Two-wheelers and scooters' }
    ];
    await VehicleType.deleteMany({});
    await VehicleType.insertMany(baseline);
    console.log('✅ Vehicle Types Seeded!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};
seedVehicleTypes();
