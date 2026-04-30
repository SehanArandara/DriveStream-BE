const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Service name is required'],
    unique: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  // Which vehicle categories can THIS service be performed on?
  applicableCategories: [{
    type: String
  }],
  // Specific durations and pricing per category
  config: [{
    category: {
      type: String
    },
    durationMinutes: {
      type: Number,
      required: true
    },
    priceLKR: {
      type: Number,
      required: true
    }
  }],
  isAvailable: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Service', serviceSchema);
