const express = require('express');
const router = express.Router();
const { 
  getMyInvoices, 
  getAllInvoices, 
  markAsPaid 
} = require('../controllers/invoice.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/my', getMyInvoices);
router.get('/all', authorize('admin'), getAllInvoices);
router.patch('/:id/pay', authorize('admin'), markAsPaid);

module.exports = router;
