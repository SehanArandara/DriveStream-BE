const express = require('express');
const router = express.Router();
const { getCheckoutParams, handleNotify, manualSync } = require('../controllers/payment.controller');
const { protect } = require('../middleware/auth.middleware');

// 1. PayHere Webhook (Notify URL) - Public because PayHere server calls this
// Note: PayHere sends data as application/x-www-form-urlencoded
router.post('/notify', handleNotify);

// 2. Get checkout parameters for a booking
router.get('/checkout-params/:bookingId', protect, getCheckoutParams);

// 3. Manual Sync (For Local Dev / Campus Projects)
router.post('/manual-sync', protect, manualSync);

module.exports = router;
