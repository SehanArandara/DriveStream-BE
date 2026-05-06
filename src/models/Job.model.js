const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  jobNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: true
  },
  technician: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['Waiting', 'Assigned', 'In-Progress', 'Testing', 'Completed'],
    default: 'Waiting'
  },
  // Performance Tracking
  actualStartTime: Date,
  actualEndTime: Date,
  estimatedCompletionTime: Date,
  
  // Technical Records
  technicalRemarks: String,
  nextServiceDate: Date,
  partsUsed: [{
    name: String,
    price: Number,
    quantity: { type: Number, default: 1 }
  }],
  
  // Tasks from Booking
  tasks: [{
    name: String,
    status: { 
      type: String, 
      enum: ['Pending', 'Started', 'Completed'], 
      default: 'Pending' 
    },
    isDone: { type: Boolean, default: false }
  }],
  timeline: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    note: String
  }]
}, { timestamps: true });

module.exports = mongoose.model('Job', jobSchema);
