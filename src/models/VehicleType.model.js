const mongoose = require('mongoose');

const vehicleTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Vehicle type name is required'],
    unique: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('VehicleType', vehicleTypeSchema);
