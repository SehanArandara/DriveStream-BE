const express = require('express');
const router = express.Router();
const { 
  initializeJob, 
  getJobs, 
  updateJobStatus,
  assignTechnician,
  startJob,
  completeJob,
  updateTaskStatus
} = require('../controllers/job.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/', getJobs); // Accessible to all logged-in users (filtered by controller)

router.post('/initialize/:bookingId', authorize('admin'), initializeJob);
router.patch('/:id/assign', authorize('admin'), assignTechnician);
router.patch('/:id/start', authorize('technician'), startJob);
router.patch('/:id/complete', authorize('technician'), completeJob);
router.patch('/:id/status', authorize('admin', 'technician'), updateJobStatus);
router.patch('/:id/tasks/:taskId', authorize('technician', 'admin'), updateTaskStatus);

module.exports = router;
