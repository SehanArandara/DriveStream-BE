const Service = require('../models/Service.model');

// @desc Create new service in catalog
// @route POST /api/services
const createService = async (req, res) => {
  try {
    const service = await Service.create(req.body);
    res.status(201).json(service);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// @desc Get all services (Admin sees all, Customer sees active only)
// @route GET /api/services
const getServices = async (req, res) => {
  try {
    const { category } = req.query;
    let query = {};
    
    // If a category is provided (e.g. SUV), only show services applicable to SUVs
    if (category) {
      query = { 
        isAvailable: true,
        applicableCategories: category 
      };
    } else if (req.user.role === 'customer') {
      query = { isAvailable: true };
    }

    const services = await Service.find(query).sort({ name: 1 });
    res.json(services);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Update service config
// @route PUT /api/services/:id
const updateService = async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    );
    if (!service) return res.status(404).json({ message: 'Service not found' });
    res.json(service);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// @desc Toggle service availability (Soft Delete)
// @route PATCH /api/services/:id/toggle
const toggleServiceStatus = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ message: 'Service not found' });

    service.isAvailable = !service.isAvailable;
    await service.save();
    res.json({ message: `Service ${service.isAvailable ? 'activated' : 'deactivated'}`, service });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createService,
  getServices,
  updateService,
  toggleServiceStatus
};
