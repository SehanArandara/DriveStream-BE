const Booking = require('../models/Booking.model');
const Job = require('../models/Job.model');
const Invoice = require('../models/Invoice.model');
const User = require('../models/User.model');

// @desc Get Admin Dashboard Stats
const getAdminStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      pendingBookings,
      activeJobs,
      totalRevenue,
      todayRevenue,
      staffCount,
      totalInvoices
    ] = await Promise.all([
      Booking.countDocuments({ status: 'Pending' }),
      Job.countDocuments({ status: { $in: ['Assigned', 'In-Progress'] } }),
      Invoice.aggregate([{ $group: { _id: null, total: { $sum: "$grandTotal" } } }]),
      Invoice.aggregate([
        { $match: { createdAt: { $gte: today } } },
        { $group: { _id: null, total: { $sum: "$grandTotal" } } }
      ]),
      User.countDocuments({ role: { $in: ['admin', 'technician'] }, isActive: true }),
      Invoice.countDocuments()
    ]);

    res.json({
      pendingBookings,
      activeJobs,
      totalRevenue: totalRevenue[0]?.total || 0,
      todayRevenue: todayRevenue[0]?.total || 0,
      staffCount,
      totalInvoices
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getAdminStats };
