const User = require('../models/User.model');

// GET /api/staff  (Admin only)
const getAllStaff = async (req, res) => {
  try {
    // Senior SE Logic: 
    // Super Admins see everyone (Admins + Technicians)
    // Regular Admins only see Technicians
    const filter = req.user.isSuperAdmin 
      ? { role: { $in: ['admin', 'technician'] } } 
      : { role: 'technician' };

    console.log(`[Staff] List requested by ${req.user.email}. SuperAdmin: ${req.user.isSuperAdmin}`);
    const staff = await User.find(filter).sort({ role: 1, name: 1 });
    res.json({ staff });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/staff/:id/status (Admin only)
const updateStaffStatus = async (req, res) => {
  try {
    const { isActive } = req.body;
    const user = await User.findById(req.params.id);
    
    if (!user) return res.status(404).json({ message: 'Staff member not found.' });

    // Hierarchy Check: Normal admins cannot touch other admins
    if (user.role === 'admin' && !req.user.isSuperAdmin) {
      return res.status(403).json({ message: 'Permission Denied: You cannot modify other Managers.' });
    }

    user.isActive = isActive;
    await user.save();

    console.log(`[Admin] Staff ${user.email} status updated to: ${isActive ? 'Active' : 'Deactivated'}`);
    res.json({ message: `Staff account ${isActive ? 'activated' : 'deactivated'} successfully.`, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/staff/:id (Admin only)
const updateStaffDetails = async (req, res) => {
  try {
    const { name, phone, role } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) return res.status(404).json({ message: 'Staff member not found.' });

    // Hierarchy Check
    if (user.role === 'admin' && !req.user.isSuperAdmin) {
      return res.status(403).json({ message: 'Permission Denied: You cannot modify other Managers.' });
    }

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (role && ['admin', 'technician'].includes(role)) {
      // Prevent normal admin from promoting themselves or others to admin
      if (role === 'admin' && !req.user.isSuperAdmin) {
        return res.status(403).json({ message: 'Only Senior Managers can grant Admin privileges.' });
      }
      user.role = role;
    }

    await user.save();
    res.json({ message: 'Staff details updated.', user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getAllStaff, updateStaffStatus, updateStaffDetails };
