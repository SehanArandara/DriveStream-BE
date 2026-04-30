const express = require('express');
const router = express.Router();
const { createType, getTypes, updateType, toggleType } = require('../controllers/vehicleType.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// Publicly available to logged-in users (for dropdowns)
router.get('/', protect, getTypes);

// Admin-only management
router.post('/', protect, authorize('admin'), createType);
router.put('/:id', protect, authorize('admin'), updateType);
router.patch('/:id/toggle', protect, authorize('admin'), toggleType);

module.exports = router;
