const Booking = require('../models/Booking.model');
const Payment = require('../models/Payment.model');
const Invoice = require('../models/Invoice.model');
const { generateHash, verifyNotificationHash } = require('../services/payhere.service');

// @desc Get checkout parameters for PayHere
// @route GET /api/payments/checkout-params/:bookingId
const getCheckoutParams = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId).populate('customer');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    // Check if already paid
    if (booking.paymentStatus === 'Paid') {
      return res.status(400).json({ message: 'Booking is already paid.' });
    }

    const merchantId = process.env.PAYHERE_MERCHANT_ID;
    const merchantSecret = process.env.PAYHERE_SECRET;
    const currency = 'LKR';
    const amount = booking.totalPrice;

    const hash = generateHash(merchantId, booking._id.toString(), amount, currency, merchantSecret);

    const params = {
      merchant_id: merchantId,
      return_url: `${process.env.CLIENT_URL}/payment-success`,
      cancel_url: `${process.env.CLIENT_URL}/payment-cancel`,
      notify_url: `${process.env.API_URL}/payments/notify`, // Ensure API_URL is in .env
      order_id: booking._id.toString(),
      items: `Service Booking: ${booking._id}`,
      amount: amount,
      currency: currency,
      hash: hash,
      first_name: booking.customer.name.split(' ')[0],
      last_name: booking.customer.name.split(' ')[1] || 'Customer',
      email: booking.customer.email,
      phone: booking.customer.phone || '0771234567',
      address: 'DriveStream Workshop',
      city: 'Colombo',
      country: 'Sri Lanka'
    };

    // Create a pending payment record
    await Payment.findOneAndUpdate(
      { booking: booking._id },
      { amount, currency, status: 'pending' },
      { upsert: true, new: true }
    );

    res.json(params);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Handle PayHere Notification (Webhook)
// @route POST /api/payments/notify
const handleNotify = async (req, res) => {
  try {
    const {
      merchant_id,
      order_id,
      payment_id,
      payhere_amount,
      payhere_currency,
      status_code,
      md5sig,
      method,
      status_message,
      card_holder_name,
      card_masked
    } = req.body;

    // 1. Verify Hash
    const isValid = verifyNotificationHash(req.body, process.env.PAYHERE_SECRET);
    if (!isValid) {
      console.error('❌ PayHere Hash Verification Failed');
      return res.status(400).send('Invalid Signature');
    }

    // 2. Find Payment & Booking
    const payment = await Payment.findOne({ booking: order_id });
    if (!payment) return res.status(404).send('Payment record not found');

    const booking = await Booking.findById(order_id);
    if (!booking) return res.status(404).send('Booking not found');

    // 3. Check status_code (2 = Success)
    if (status_code == 2) {
      // Update Payment
      payment.status = 'success';
      payment.transactionId = payment_id;
      payment.method = method;
      payment.statusCode = status_code;
      payment.statusMessage = status_message;
      payment.cardHolder = card_holder_name;
      payment.cardMask = card_masked;
      payment.rawData = req.body;
      await payment.save();

      // Update Booking
      booking.status = 'Confirmed';
      booking.paymentStatus = 'Paid';
      await booking.save();

      console.log(`✅ Payment successful for Booking: ${order_id}`);
      
      // Auto-generate Invoice
      await Invoice.create({
        booking: booking._id,
        customer: booking.customer,
        vehicle: booking.vehicle,
        baseServiceCost: booking.totalPrice,
        grandTotal: booking.totalPrice,
        isPaid: true,
        paymentMethod: method || 'Online/PayHere',
        paidAt: new Date()
      });
      console.log(`🧾 Invoice automatically generated for Booking: ${order_id}`);
    } else {
      payment.status = 'failed';
      payment.statusMessage = status_message;
      payment.rawData = req.body;
      await payment.save();

      // Update Booking Payment Status
      booking.paymentStatus = 'Failed';
      await booking.save();
      
      console.log(`⚠️ Payment failed for Booking: ${order_id} - ${status_message}`);
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error('❌ Notify Error:', err.message);
    res.status(500).send(err.message);
  }
};

// @desc Manual sync from frontend (For Local Dev / Campus Projects)
// @route POST /api/payments/manual-sync
const manualSync = async (req, res) => {
  try {
    const { bookingId, payhereId } = req.body;
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    // 1. Update Booking
    booking.status = 'Confirmed';
    booking.paymentStatus = 'Paid';
    await booking.save();

    // 2. Update/Create Payment Record
    await Payment.findOneAndUpdate(
      { booking: bookingId },
      { 
        status: 'success', 
        transactionId: payhereId,
        method: 'Online/Manual-Sync',
        statusMessage: 'Manually synced from frontend'
      },
      { upsert: true }
    );

    // 3. Auto-generate Invoice
    const existingInvoice = await Invoice.findOne({ booking: bookingId });
    if (!existingInvoice) {
      await Invoice.create({
        booking: booking._id,
        customer: booking.customer,
        vehicle: booking.vehicle,
        baseServiceCost: booking.totalPrice,
        grandTotal: booking.totalPrice,
        isPaid: true,
        paymentMethod: 'Online/Manual-Sync',
        paidAt: new Date()
      });
      console.log(`🧾 Invoice generated via manual sync for Booking: ${bookingId}`);
    }

    res.json({ message: 'Database updated successfully (Manual Sync)' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getCheckoutParams,
  handleNotify,
  manualSync
};
