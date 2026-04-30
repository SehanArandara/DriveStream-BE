const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  registrationNumber: {
    type: String,
    required: [true, 'Registration number is required'],
    unique: true,
    uppercase: true,
    trim: true
  },
  category: {
    type: String,
    required: true
    // Enum removed: and Category list is now dynamic
  },
  brand: {
    type: String,
    required: true,
    enum: ['Toyota', 'Honda', 'Suzuki', 'Nissan', 'Mitsubishi', 'BMW', 'Mercedes', 'Other']
  },
  model: {
    type: String,
    required: true,
    trim: true
  },
  manufactureYear: {
    type: Number,
    required: true,
    min: 1900,
    max: new Date().getFullYear() + 1
  },
  fuelType: {
    type: String,
    required: true,
    enum: ['Petrol', 'Diesel', 'Hybrid', 'Electric']
  },
  engineCapacity: {
    type: Number, // In CC
    required: false
  },
  chassisNumber: {
    type: String,
    unique: true,
    sparse: true,
    uppercase: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Vehicle', vehicleSchema);
