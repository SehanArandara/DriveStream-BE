const Job = require('../models/Job.model');
const Booking = require('../models/Booking.model');

// @desc Initialize a Job from a Booking
const initializeJob = async (req, res) => {
  try {
    const { technicianId } = req.body;
    const booking = await Booking.findById(req.params.bookingId).populate('customer').populate('services');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const existing = await Job.findOne({ booking: booking._id });
    if (existing) return res.status(400).json({ message: 'Job already exists for this booking' });

    const job = await Job.create({
      jobNumber: `JOB-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`,
      booking: booking._id,
      customer: booking.customer._id,
      vehicle: booking.vehicle,
      technician: technicianId || null,
      status: technicianId ? 'Assigned' : 'Waiting',
      tasks: booking.services.map(s => ({ name: s.name, isDone: false })),
      timeline: [{ 
        status: technicianId ? 'Assigned' : 'Waiting', 
        note: technicianId ? 'Vehicle confirmed and technician assigned.' : 'Vehicle entered workshop queue.' 
      }]
    });

    // Update booking status
    booking.status = 'Confirmed';
    await booking.save();

    // Notify Technician via SMS if assigned
    if (technicianId) {
      const User = require('../models/User.model');
      const tech = await User.findById(technicianId);
      if (tech && tech.phone) {
        const { sendSMS } = require('../services/sms.service');
        await sendSMS(tech.phone, `DriveStream: New Job Assigned! Vehicle ${booking.vehicle?.registrationNumber || 'Pending'} is ready for service. View in Tech Portal.`);
      }
    }

    res.status(201).json(job);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Get all jobs (Customer sees own, Staff sees ALL)
const getJobs = async (req, res) => {
  try {
    let query = { customer: req.user._id };

    if (req.user.role === 'admin' || req.user.role === 'technician') {
      query = {};
    }

    const jobs = await Job.find(query)
      .populate('vehicle', 'registrationNumber brand model')
      .populate('customer', 'name phone email')
      .populate('technician', 'name phone')
      .sort({ createdAt: -1 });
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Assign technician
const assignTechnician = async (req, res) => {
  try {
    const { technicianId } = req.body;
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    job.technician = technicianId;
    job.status = 'Assigned';
    job.timeline.push({ status: 'Assigned', note: `Technician assigned to vehicle` });
    await job.save();

    // SMS to Technician
    const User = require('../models/User.model');
    const tech = await User.findById(technicianId);
    if (tech && tech.phone) {
      const { sendSMS } = require('../services/sms.service');
      await sendSMS(tech.phone, `DriveStream: A new job has been assigned to you. Please check your workshop board.`);
    }

    res.json(job);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// @desc Start Timer
const startJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    job.status = 'In-Progress';
    job.actualStartTime = new Date();
    job.timeline.push({ status: 'In-Progress', note: 'Technician started work' });
    await job.save();
    res.json(job);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// @desc Complete Job
const completeJob = async (req, res) => {
  try {
    const { technicalRemarks, partsUsed, nextServiceDate } = req.body;
    const job = await Job.findById(req.params.id)
      .populate('booking')
      .populate('vehicle')
      .populate('customer');

    if (!job) return res.status(404).json({ message: 'Job not found' });

    job.status = 'Completed';
    job.actualEndTime = new Date();
    job.technicalRemarks = technicalRemarks;
    job.partsUsed = partsUsed;
    job.nextServiceDate = nextServiceDate;
    job.timeline.push({ status: 'Completed', note: 'Service finished' });
    await job.save();

    const partsTotal = (partsUsed || []).reduce((sum, p) => sum + (p.price * p.quantity), 0);
    const baseServiceCost = job.booking.totalPrice;
    
    const Invoice = require('../models/Invoice.model');
    await Invoice.create({
      job: job._id,
      customer: job.customer._id,
      vehicle: job.vehicle._id,
      baseServiceCost,
      partsTotal,
      grandTotal: baseServiceCost + partsTotal
    });

    // SMS Notification to Customer
    if (job.customer && job.customer.phone) {
      const { sendSMS } = require('../services/sms.service');
      await sendSMS(job.customer.phone, `DriveStream: Your vehicle (${job.vehicle?.registrationNumber}) service is complete! An invoice for LKR ${(baseServiceCost + partsTotal).toLocaleString()} has been generated.`);
    }

    res.json({ message: 'Job completed and Invoice generated', job });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// @desc Update Status (Generic)
const updateJobStatus = async (req, res) => {
    try {
      const { status, note } = req.body;
      const job = await Job.findById(req.params.id);
      if (!job) return res.status(404).json({ message: 'Job not found' });
  
      job.status = status;
      job.timeline.push({ status, note });
      await job.save();
  
      res.json(job);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  };

// @desc Update individual task progress
const updateTaskStatus = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { isDone } = req.body;
    
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    const task = job.tasks.id(taskId);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    task.isDone = isDone;
    
    // Add to timeline
    job.timeline.push({
      status: job.status,
      note: `Task ${isDone ? 'Completed' : 'Reopened'}: ${task.name}`
    });

    await job.save();
    res.json(job);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

module.exports = {
  initializeJob,
  getJobs,
  updateJobStatus,
  assignTechnician,
  startJob,
  completeJob,
  updateTaskStatus
};

