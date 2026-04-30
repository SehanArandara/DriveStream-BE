const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: [
        'booking_confirmed', 'booking_cancelled',
        'job_status_update', 'job_completed',
        'invoice_sent', 'payment_received',
        'maintenance_reminder', 'general',
      ],
      required: true,
    },
    channel:  { type: String, enum: ['sms', 'email', 'in-app'], default: 'in-app' },
    message:  { type: String, required: true },
    phone:    { type: String },   // for SMS
    status:   { type: String, enum: ['pending', 'sent', 'failed', 'read'], default: 'pending' },
    sentAt:   { type: Date },
    readAt:   { type: Date },
    metadata: { type: mongoose.Schema.Types.Mixed },  // extra context (jobId, invoiceId, etc.)
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
