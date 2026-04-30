const router = require('express').Router();
const { getAllStaff, updateStaffStatus, updateStaffDetails } = require('../controllers/staff.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// All routes here are restricted to ADMIN (Manager/Service Admin)
router.use(protect);
router.use(authorize('admin'));

router.get('/',           getAllStaff);
router.patch('/:id/status', updateStaffStatus);
router.put('/:id',        updateStaffDetails);

module.exports = router;
