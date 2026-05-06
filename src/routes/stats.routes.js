const express = require('express');
const router = express.Router();
const { getAdminStats } = require('../controllers/stats.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.get('/admin', protect, authorize('admin'), getAdminStats);

module.exports = router;
