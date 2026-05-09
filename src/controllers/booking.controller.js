const Booking = require('../models/Booking.model');
const Service = require('../models/Service.model');
const Vehicle = require('../models/Vehicle.model');

// SSE Configuration: Workshop Capacity
// Default: 3 Techs * 8 Hours * 60 Mins = 1440 mins
const DAILY_MAX_MINUTES = 1440;

// @desc Start of day helper
const getStartOfDay = (dateStr) => {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return d;
};

// @desc Check if a date can accommodate a specific duration
// @route GET /api/bookings/check-availability
const checkAvailability = async (req, res) => {
  try {
    const { date, duration } = req.query;
    if (!date || !duration) return res.status(400).json({ message: 'Date and duration are required' });

    const targetDate = getStartOfDay(date);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Sum existing bookings for this day
    const existingBookings = await Booking.find({
      date: { $gte: targetDate, $lte: endOfDay },
      status: { $ne: 'Cancelled' }
    });

    const bookedMinutes = existingBookings.reduce((sum, b) => sum + b.totalDuration, 0);
    const requestedMinutes = parseInt(duration);

    const remaining = DAILY_MAX_MINUTES - bookedMinutes;
    const isAvailable = remaining >= requestedMinutes;

    res.json({
      date: targetDate,
      maxCapacity: DAILY_MAX_MINUTES,
      bookedMinutes,
      remainingMinutes: remaining,
      requestedMinutes,
      isAvailable
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Create a new booking
// @route POST /api/bookings
const createBooking = async (req, res) => {
  try {
    const { vehicleId, serviceIds, date, notes } = req.body;

    // 1. Fetch Vehicle to get Category
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

    // 2. Fetch Services and Calculate Contextual Totals
    const servicesData = await Service.find({ _id: { $in: serviceIds } });

    let totalDuration = 0;
    let totalPrice = 0;
    const formattedServices = [];

    servicesData.forEach(s => {
      const config = s.config.find(c => c.category === vehicle.category);
      if (config) {
        totalDuration += config.durationMinutes;
        totalPrice += config.priceLKR;
        formattedServices.push({
          serviceId: s._id,
          name: s.name,
          price: config.priceLKR,
          duration: config.durationMinutes
        });
      }
    });

    // 3. Final Availability Check (Pre-save validation)
    const targetDate = getStartOfDay(date);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingBookings = await Booking.find({
      date: { $gte: targetDate, $lte: endOfDay },
      status: { $ne: 'Cancelled' }
    });

    const bookedMinutes = existingBookings.reduce((sum, b) => sum + b.totalDuration, 0);
    if ((bookedMinutes + totalDuration) > DAILY_MAX_MINUTES) {
      return res.status(400).json({
        message: `Capacity exceeded for ${date}. Only ${DAILY_MAX_MINUTES - bookedMinutes} mins left.`
      });
    }

    // 4. Save Booking
    const booking = await Booking.create({
      customer: req.user._id,
      vehicle: vehicleId,
      services: formattedServices,
      date: targetDate,
      totalDuration,
      totalPrice,
      notes
    });

    res.status(201).json(booking);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// @desc Get bookings (Customer sees own, Staff sees ALL)
// @route GET /api/bookings/my
const getMyBookings = async (req, res) => {
  try {
    let query = { customer: req.user._id };

    // If Admin or Technician, show everything
    if (req.user.role === 'admin' || req.user.role === 'technician') {
      query = {};
    }

    const bookings = await Booking.find(query)
      .populate('vehicle')
      .populate('customer', 'name email phone')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Get single booking detail
// @route GET /api/bookings/:id
const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('vehicle')
      .populate('customer', 'name email phone');

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    // Security: Only owner or admin can see this
    if (booking.customer._id.toString() !== req.user._id.toString() && req.user.role !== 'admin' && req.user.role !== 'technician') {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  checkAvailability,
  createBooking,
  getMyBookings,
  getBookingById
};
