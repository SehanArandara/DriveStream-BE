const Invoice = require('../models/Invoice.model');

// @desc Get My Invoices (Customer)
const getMyInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find({ customer: req.user._id })
      .populate('vehicle')
      .populate('job')
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
