// tests/job.controller.test.js

const request = require('supertest');
const express = require('express');

jest.mock('../models/Job.model', () => ({
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
}));

jest.mock('../models/Booking.model', () => ({
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
}));

jest.mock('../models/Invoice.model', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  findOneAndUpdate: jest.fn(),
}));

jest.mock('../models/User.model', () => ({
  findById: jest.fn(),
}));

jest.mock('../services/sms.service', () => ({
  sendSMS: jest.fn(),
  templates: {
    BOOKING_CONFIRMED: jest.fn(() => 'BOOKING_CONFIRMED_SMS'),
    SERVICE_STARTED: jest.fn(() => 'SERVICE_STARTED_SMS'),
    SERVICE_COMPLETED: jest.fn(() => 'SERVICE_COMPLETED_SMS'),
  },
}));

const Job = require('../models/Job.model');
const Booking = require('../models/Booking.model');
const Invoice = require('../models/Invoice.model');
const User = require('../models/User.model');

const {
  initializeJob,
  getJobs,
  assignTechnician,
  startJob,
  completeJob,
  updateJobStatus,
  updateTaskStatus,
} = require('../controllers/job.controller');

const app = express();
app.use(express.json());

// Mock authenticated user
app.use((req, res, next) => {
  req.user = {
    _id: 'user123',
    role: 'customer',
  };
  next();
});

// Routes
app.post('/api/jobs/init/:bookingId', initializeJob);
app.get('/api/jobs', getJobs);
app.patch('/api/jobs/:id/assign', assignTechnician);
app.patch('/api/jobs/:id/start', startJob);
app.patch('/api/jobs/:id/complete', completeJob);
app.patch('/api/jobs/:id/status', updateJobStatus);
app.patch('/api/jobs/:id/tasks/:taskId', updateTaskStatus);

describe('Job Controller Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================
  // INITIALIZE JOB
  // =========================================================
  describe('POST /api/jobs/init/:bookingId', () => {
    test('should initialize a job successfully', async () => {
      const booking = {
        _id: 'booking1',
        customer: {
          _id: 'customer1',
          phone: '0771234567',
        },
        vehicle: {
          registrationNumber: 'ABC1234',
        },
        services: [
          { name: 'Oil Change' },
        ],
        status: 'Pending',
        save: jest.fn(),
        date: new Date(),
      };

      Booking.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(booking),
        }),
      });

      Job.findOne.mockResolvedValue(null);

      Job.create.mockResolvedValue({
        _id: 'job1',
      });

      Invoice.findOneAndUpdate.mockResolvedValue(true);

      const res = await request(app)
        .post('/api/jobs/init/booking1')
        .send({
          technicianId: 'tech1',
        });

      expect(res.statusCode).toBe(201);
    });

    test('should return 404 if booking not found', async () => {
      Booking.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(null),
        }),
      });

      const res = await request(app)
        .post('/api/jobs/init/booking1');

      expect(res.statusCode).toBe(404);
    });
  });

  // =========================================================
  // GET JOBS
  // =========================================================
  describe('GET /api/jobs', () => {
    test('should return jobs', async () => {
      const jobs = [{ _id: 'job1' }];

      Job.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              sort: jest.fn().mockResolvedValue(jobs),
            }),
          }),
        }),
      });

      const res = await request(app).get('/api/jobs');

      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBe(1);
    });
  });

  // =========================================================
  // ASSIGN TECHNICIAN
  // =========================================================
  describe('PATCH /api/jobs/:id/assign', () => {
    test('should assign technician successfully', async () => {
      const job = {
        technician: null,
        status: 'Waiting',
        timeline: [],
        save: jest.fn(),
      };

      Job.findById.mockResolvedValue(job);

      User.findById.mockResolvedValue({
        phone: '0771234567',
      });

      const res = await request(app)
        .patch('/api/jobs/job1/assign')
        .send({
          technicianId: 'tech1',
        });

      expect(res.statusCode).toBe(200);
      expect(job.status).toBe('Assigned');
    });

    test('should return 404 if job not found', async () => {
      Job.findById.mockResolvedValue(null);

      const res = await request(app)
        .patch('/api/jobs/job1/assign')
        .send({
          technicianId: 'tech1',
        });

      expect(res.statusCode).toBe(404);
    });
  });

  // =========================================================
  // START JOB
  // =========================================================
  describe('PATCH /api/jobs/:id/start', () => {
    test('should start job successfully', async () => {
      const job = {
        booking: 'booking1',
        customer: {
          phone: '0771234567',
        },
        vehicle: {
          registrationNumber: 'ABC1234',
        },
        timeline: [],
        save: jest.fn(),
      };

      Job.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(job),
        }),
      });

      Booking.findByIdAndUpdate.mockResolvedValue(true);

      const res = await request(app)
        .patch('/api/jobs/job1/start');

      expect(res.statusCode).toBe(200);
      expect(job.status).toBe('In-Progress');
    });
  });

  // =========================================================
  // COMPLETE JOB
  // =========================================================
  describe('PATCH /api/jobs/:id/complete', () => {
    test('should complete job successfully', async () => {
      const job = {
        _id: 'job1',
        booking: {
          _id: 'booking1',
          totalPrice: 5000,
        },
        vehicle: {
          _id: 'vehicle1',
          registrationNumber: 'ABC1234',
        },
        customer: {
          _id: 'customer1',
          phone: '0771234567',
        },
        timeline: [],
        save: jest.fn(),
      };

      Job.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue(job),
          }),
        }),
      });

      Booking.findByIdAndUpdate.mockResolvedValue(true);

      Invoice.findOne.mockResolvedValue(null);

      Invoice.create.mockResolvedValue(true);

      const res = await request(app)
        .patch('/api/jobs/job1/complete')
        .send({
          technicalRemarks: 'Completed',
          partsUsed: [
            {
              price: 1000,
              quantity: 2,
            },
          ],
        });

      expect(res.statusCode).toBe(200);
      expect(job.status).toBe('Completed');
    });
  });

  // =========================================================
  // UPDATE JOB STATUS
  // =========================================================
  describe('PATCH /api/jobs/:id/status', () => {
    test('should update job status', async () => {
      const job = {
        status: 'Waiting',
        timeline: [],
        save: jest.fn(),
      };

      Job.findById.mockResolvedValue(job);

      const res = await request(app)
        .patch('/api/jobs/job1/status')
        .send({
          status: 'Paused',
          note: 'Waiting for parts',
        });

      expect(res.statusCode).toBe(200);
      expect(job.status).toBe('Paused');
    });
  });

  // =========================================================
  // UPDATE TASK STATUS
  // =========================================================
  describe('PATCH /api/jobs/:id/tasks/:taskId', () => {
    test('should update task status', async () => {
      const task = {
        name: 'Oil Change',
        status: 'Pending',
        isDone: false,
      };

      const job = {
        status: 'In-Progress',
        tasks: {
          id: jest.fn().mockReturnValue(task),
        },
        timeline: [],
        save: jest.fn(),
      };

      Job.findById.mockResolvedValue(job);

      const res = await request(app)
        .patch('/api/jobs/job1/tasks/task1')
        .send({
          status: 'Completed',
        });

      expect(res.statusCode).toBe(200);
      expect(task.status).toBe('Completed');
      expect(task.isDone).toBe(true);
    });

    test('should return 404 if task not found', async () => {
      const job = {
        tasks: {
          id: jest.fn().mockReturnValue(null),
        },
      };

      Job.findById.mockResolvedValue(job);

      const res = await request(app)
        .patch('/api/jobs/job1/tasks/task1')
        .send({
          status: 'Completed',
        });

      expect(res.statusCode).toBe(404);
    });
  });
});