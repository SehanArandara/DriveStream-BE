const Invoice = require('../models/Invoice.model');

// @desc Get My Invoices (Customer)
const getMyInvoices = async (req, res) => {
  try {
    let query = { customer: req.user._id };
    
    // If Admin, show everything
    if (req.user.role === 'admin') {
      query = {};
    }

    const invoices = await Invoice.find(query)
      .populate('vehicle')
      .populate('customer', 'name email phone')
      .populate('job')
      .populate('booking')
      .sort({ createdAt: -1 });
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Get All Invoices (Admin)
const getAllInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find()
      .populate('customer', 'name email')
      .populate('vehicle')
      .sort({ createdAt: -1 });
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Mark as Paid
const markAsPaid = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    invoice.isPaid = true;
    invoice.paidAt = new Date();
    invoice.paymentMethod = req.body.paymentMethod || 'Cash';
    await invoice.save();

    // ✅ SMS TO CUSTOMER: Payment Received
    try {
      const populatedInvoice = await Invoice.findById(invoice._id).populate('customer');
      if (populatedInvoice.customer?.phone) {
        const { sendSMS, templates } = require('../services/sms.service');
        await sendSMS(
          populatedInvoice.customer.phone,
          templates.PAYMENT_RECEIVED(invoice.grandTotal.toLocaleString(), invoice.invoiceNumber)
        );
      }
    } catch (smsErr) {
      console.log('Payment SMS Error:', smsErr.message);
    }

    res.json(invoice);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

module.exports = {
  getMyInvoices,
  getAllInvoices,
  markAsPaid
};
