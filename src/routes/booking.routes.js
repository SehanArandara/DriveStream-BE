const express = require('express');
const router = express.Router();
const { 
  checkAvailability, 
  createBooking, 
  getMyBookings,
  getBookingById
} = require('../controllers/booking.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/check-availability', checkAvailability);
router.post('/', createBooking);
router.get('/my', getMyBookings);
router.get('/:id', getBookingById);

module.exports = router;
