const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    unique: true
  },
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: false // Optional for pre-paid bookings
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
  // Split costs for transparency
  baseServiceCost: { type: Number, required: true },
  partsTotal: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true },
  
  isPaid: {
    type: Boolean,
    default: false
  },
  paymentMethod: String,
  paidAt: Date
}, { timestamps: true });

// Auto-generate Invoice Number before saving
invoiceSchema.pre('save', function(next) {
  if (!this.invoiceNumber) {
    this.invoiceNumber = 'IV-' + Math.random().toString(36).substr(2, 9).toUpperCase();
  }
  next();
});

module.exports = mongoose.model('Invoice', invoiceSchema);
