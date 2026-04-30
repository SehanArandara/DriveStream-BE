const VehicleType = require('../models/VehicleType.model');

// @desc Add new vehicle type
const createType = async (req, res) => {
  try {
    const type = await VehicleType.create(req.body);
    res.status(201).json(type);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// @desc List all types
const getTypes = async (req, res) => {
  try {
    const types = await VehicleType.find({ isActive: true }).sort({ name: 1 });
    res.json(types);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Update type details
const updateType = async (req, res) => {
  try {
    const type = await VehicleType.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(type);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// @desc Deactivate type
const toggleType = async (req, res) => {
  try {
    const type = await VehicleType.findById(req.params.id);
    type.isActive = !type.isActive;
    await type.save();
    res.json(type);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createType, getTypes, updateType, toggleType };
