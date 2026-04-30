const express = require('express');
const router = express.Router();
const { 
  addVehicle, 
  getMyVehicles, 
  getVehicleById, 
  updateVehicle, 
  deleteVehicle,
  searchVehicle,
  getAllVehiclesAdmin
} = require('../controllers/vehicle.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// All vehicle routes are protected
router.use(protect);

// Global Admin Routes (Staff only)
router.get('/admin/all', authorize('admin', 'technician'), getAllVehiclesAdmin);
router.get('/search/:plate', authorize('admin', 'technician'), searchVehicle);

router.route('/')
  .post(addVehicle)
  .get(getMyVehicles);

router.route('/:id')
  .get(getVehicleById)
  .put(updateVehicle)
  .delete(deleteVehicle);

module.exports = router;
