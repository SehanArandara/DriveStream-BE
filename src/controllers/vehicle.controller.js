const Vehicle = require('../models/Vehicle.model');

// @desc Add a new vehicle
// @route POST /api/vehicles
const addVehicle = async (req, res) => {
  try {
    const { registrationNumber } = req.body;
    let vehicleData = { ...req.body, owner: req.user._id };

    // Senior SE Fix: Convert empty strings to undefined so 'sparse' unique index works
    if (!vehicleData.chassisNumber) delete vehicleData.chassisNumber;
    if (!vehicleData.engineCapacity) delete vehicleData.engineCapacity;

    // Check if vehicle exists
    const existing = await Vehicle.findOne({ registrationNumber });
    if (existing) return res.status(400).json({ message: 'Vehicle already registered.' });

    // Create vehicle
    const vehicle = await Vehicle.create(vehicleData);

    console.log(`[Vehicle] New registration SUCCESS: ${registrationNumber} for user ${req.user.email}`);
    res.status(201).json({ message: 'Vehicle added to your garage successfully.', vehicle });
  } catch (err) {
    console.error("[Vehicle Controller Error]:", err);
    res.status(500).json({ 
      message: "Internal Server Error during vehicle creation", 
      detail: err.message,
      errors: err.errors
    });
  }
};

// @desc Get all vehicles for logged in customer
// @route GET /api/vehicles
const getMyVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ owner: req.user._id }).sort({ createdAt: -1 });
    res.json({ count: vehicles.length, vehicles });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Get single vehicle details
// @route GET /api/vehicles/:id
const getVehicleById = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found.' });
    
    // Security: Only owner or staff can view
    if (vehicle.owner.toString() !== req.user._id.toString() && req.user.role === 'customer') {
      return res.status(403).json({ message: 'Access denied.' });
    }

    res.json(vehicle);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Update vehicle details
// @route PUT /api/vehicles/:id
const updateVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found.' });

    // Security: Only owner can update
    if (vehicle.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only edit your own vehicles.' });
    }

    // Sanitize optional fields
    let updateData = { ...req.body };
    if (updateData.chassisNumber === "") updateData.chassisNumber = null;
    if (updateData.engineCapacity === "") updateData.engineCapacity = null;

    const updatedVehicle = await Vehicle.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res.json({ message: 'Vehicle updated successfully.', vehicle: updatedVehicle });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Delete vehicle
// @route DELETE /api/vehicles/:id
const deleteVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found.' });

    // Security: Only owner can delete
    if (vehicle.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only remove your own vehicles.' });
    }

    await Vehicle.findByIdAndDelete(req.params.id);
    res.json({ message: 'Vehicle removed from your garage.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Search vehicle by plate (Admin/Staff only)
// @route GET /api/vehicles/search/:plate
const searchVehicle = async (req, res) => {
  try {
    const { plate } = req.params;
    console.log(`[Admin] Searching for vehicle: ${plate}`);
    
    // Use regex for flexible search (case insensitive)
    const vehicle = await Vehicle.findOne({ 
      registrationNumber: { $regex: new RegExp(plate, 'i') } 
    }).populate('owner', 'name email phone');

    if (!vehicle) return res.status(404).json({ message: 'No vehicle found with that registration number.' });

    res.json(vehicle);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Global directory (Admin/Staff only)
// @route GET /api/vehicles/admin/all
const getAllVehiclesAdmin = async (req, res) => {
  try {
    console.log(`[Admin] Accessing global vehicle directory`);
    const vehicles = await Vehicle.find().populate('owner', 'name email').sort({ createdAt: -1 });
    res.json({ count: vehicles.length, vehicles });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  addVehicle,
  getMyVehicles,
  getVehicleById,
  updateVehicle,
  deleteVehicle,
  searchVehicle,
  getAllVehiclesAdmin
};
