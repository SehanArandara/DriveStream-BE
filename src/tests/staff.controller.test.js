const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');

jest.mock('../models/User.model');

const User = require('../models/User.model');
const {
  getAllStaff,
  updateStaffStatus,
  updateStaffDetails,
} = require('../controllers/staff.controller');

const app = express();
app.use(express.json());

// Mock auth middleware
const mockAdmin = {
  _id: new mongoose.Types.ObjectId(),
  email: 'admin@test.com',
  role: 'admin',
  isSuperAdmin: false,
};

const mockSuperAdmin = {
  _id: new mongoose.Types.ObjectId(),
  email: 'superadmin@test.com',
  role: 'admin',
  isSuperAdmin: true,
};

// Inject mock user
const authMiddleware = (user) => (req, res, next) => {
  req.user = user;
  next();
};

// Routes
app.get('/api/staff', authMiddleware(mockAdmin), getAllStaff);
app.patch('/api/staff/:id/status', authMiddleware(mockAdmin), updateStaffStatus);
app.put('/api/staff/:id', authMiddleware(mockAdmin), updateStaffDetails);

describe('Staff Controller Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================
  // GET ALL STAFF
  // =========================================================
  describe('GET /api/staff', () => {
    test('should return only technicians for normal admin', async () => {
      const mockStaff = [
        {
          _id: '1',
          name: 'Tech One',
          role: 'technician',
        },
      ];

      User.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockStaff),
      });

      const res = await request(app).get('/api/staff');

      expect(res.statusCode).toBe(200);
      expect(res.body.staff).toEqual(mockStaff);

      expect(User.find).toHaveBeenCalledWith({
        role: 'technician',
      });
    });

    test('should handle server errors', async () => {
      User.find.mockImplementation(() => {
        throw new Error('Database Error');
      });

      const res = await request(app).get('/api/staff');

      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe('Database Error');
    });
  });

  // =========================================================
  // UPDATE STAFF STATUS
  // =========================================================
  describe('PATCH /api/staff/:id/status', () => {
    test('should update technician status successfully', async () => {
      const mockUser = {
        _id: '1',
        email: 'tech@test.com',
        role: 'technician',
        isActive: true,
        save: jest.fn().mockResolvedValue(true),
      };

      User.findById.mockResolvedValue(mockUser);

      const res = await request(app)
        .patch('/api/staff/1/status')
        .send({ isActive: false });

      expect(res.statusCode).toBe(200);
      expect(mockUser.isActive).toBe(false);

      expect(res.body.message).toContain('deactivated');
    });

    test('should return 404 if user not found', async () => {
      User.findById.mockResolvedValue(null);

      const res = await request(app)
        .patch('/api/staff/999/status')
        .send({ isActive: false });

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe('Staff member not found.');
    });

    test('should prevent normal admin from modifying another admin', async () => {
      const mockAdminUser = {
        _id: '2',
        role: 'admin',
      };

      User.findById.mockResolvedValue(mockAdminUser);

      const res = await request(app)
        .patch('/api/staff/2/status')
        .send({ isActive: false });

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toContain('Permission Denied');
    });
  });

  // =========================================================
  // UPDATE STAFF DETAILS
  // =========================================================
  describe('PUT /api/staff/:id', () => {
    test('should update technician details successfully', async () => {
      const mockUser = {
        _id: '1',
        name: 'Old Name',
        phone: '111111111',
        role: 'technician',
        save: jest.fn().mockResolvedValue(true),
      };

      User.findById.mockResolvedValue(mockUser);

      const res = await request(app)
        .put('/api/staff/1')
        .send({
          name: 'New Name',
          phone: '0771234567',
        });

      expect(res.statusCode).toBe(200);

      expect(mockUser.name).toBe('New Name');
      expect(mockUser.phone).toBe('0771234567');

      expect(res.body.message).toBe('Staff details updated.');
    });

    test('should return 404 when user not found', async () => {
      User.findById.mockResolvedValue(null);

      const res = await request(app)
        .put('/api/staff/999')
        .send({
          name: 'Test',
        });

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe('Staff member not found.');
    });

    test('should prevent normal admin from promoting user to admin', async () => {
      const mockUser = {
        _id: '1',
        role: 'technician',
        save: jest.fn(),
      };

      User.findById.mockResolvedValue(mockUser);

      const res = await request(app)
        .put('/api/staff/1')
        .send({
          role: 'admin',
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toContain('Only Senior Managers');
    });

    test('should prevent normal admin from editing another admin', async () => {
      const mockAdminUser = {
        _id: '2',
        role: 'admin',
      };

      User.findById.mockResolvedValue(mockAdminUser);

      const res = await request(app)
        .put('/api/staff/2')
        .send({
          name: 'Updated Admin',
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toContain('Permission Denied');
    });
  });
});