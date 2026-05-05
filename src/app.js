const express = require('express');
const cors = require('cors');
const app = express();
const connectDB = require('./config/db');

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth',         require('./routes/auth.routes'));
app.use('/api/staff',        require('./routes/staff.routes'));
app.use('/api/customers',    require('./routes/customer.routes'));
app.use('/api/vehicles',     require('./routes/vehicle.routes'));
app.use('/api/vehicle-types', require('./routes/vehicleType.routes'));
app.use('/api/services',     require('./routes/service.routes'));
app.use('/api/bookings',     require('./routes/booking.routes'));
app.use('/api/jobs',         require('./routes/job.routes'));
app.use('/api/invoices',     require('./routes/invoice.routes'));
app.use('/api/payments',     require('./routes/payment.routes'));
app.use('/api/notifications',require('./routes/notification.routes'));
app.use('/api/chatbot',      require('./routes/chatbot.routes'));

// ── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', async (_req, res) => {
  try {
    await connectDB();

    res.json({
      status: 'OK',
      service: 'DriveStream API',
      db: 'connected',
      timestamp: new Date()
    });

  } catch (err) {
    res.status(500).json({
      status: 'ERROR',
      db: 'disconnected',
      message: err.message
    });
  }
});

// ── 404 Handler ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// ── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('❌ Error:', err.message);
  res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
});

module.exports = app;
