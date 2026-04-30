const express = require('express');
const router = express.Router();
const { 
  createService, 
  getServices, 
  updateService, 
  toggleServiceStatus 
} = require('../controllers/service.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.get('/', protect, getServices);

// Manager Only Features
router.post('/', protect, authorize('admin'), createService);
router.put('/:id', protect, authorize('admin'), updateService);
router.patch('/:id/toggle', protect, authorize('admin'), toggleServiceStatus);

module.exports = router;
