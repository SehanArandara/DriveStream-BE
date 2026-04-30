const router       = require('express').Router();
const Notification = require('../models/Notification.model');
const { protect, authorize } = require('../middleware/auth.middleware');

// GET notifications for logged-in user
router.get('/', protect, async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { recipient: req.user._id };
    const notifications = await Notification.find(filter).sort({ createdAt: -1 }).limit(50);
    res.json({ notifications });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH mark as read
router.patch('/:id/read', protect, async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id, { status: 'read', readAt: new Date() }, { new: true }
    );
    res.json({ notification });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
