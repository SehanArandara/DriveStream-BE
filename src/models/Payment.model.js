const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  transactionId: {
    type: String, // PayHere payment_id
    unique: true,
    sparse: true // Allow null for pending payments
  },
  merchantId: String,
  orderId: String, // Usually the booking ID
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'LKR'
  },
  status: {
    type: String,
    enum: ['pending', 'success', 'failed', 'refunded'],
    default: 'pending'
  },
  method: String, // e.g. VISA, MASTER
  cardHolder: String,
  cardMask: String,
  statusCode: Number, // PayHere status_code (2 is success)
  statusMessage: String,
  rawData: mongoose.Schema.Types.Mixed // Full payload for auditing
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
