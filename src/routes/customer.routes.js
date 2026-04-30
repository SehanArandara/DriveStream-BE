const router  = require('express').Router();
const User    = require('../models/User.model');
const { protect, authorize } = require('../middleware/auth.middleware');

// GET all customers (admin/tech)
router.get('/', protect, authorize('admin', 'technician'), async (req, res) => {
  try {
    const customers = await User.find({ role: 'customer' }).sort({ createdAt: -1 });
    res.json({ customers });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET single customer
router.get('/:id', protect, authorize('admin', 'technician'), async (req, res) => {
  try {
    const customer = await User.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found.' });
    res.json({ customer });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT update customer (admin or self)
router.put('/:id', protect, async (req, res) => {
  try {
    const { name, phone } = req.body;  // customers update limited fields
    if (req.user.role !== 'admin' && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    const customer = await User.findByIdAndUpdate(req.params.id, { name, phone }, { new: true });
    res.json({ customer });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE customer (admin only)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Customer deleted.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
