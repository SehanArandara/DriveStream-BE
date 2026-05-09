// tests/vehicle.controller.test.js

const request = require('supertest');
const express = require('express');

jest.mock('../models/Vehicle.model', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
}));

jest.mock('../models/Job.model', () => ({
  find: jest.fn(),
}));

const Vehicle = require('../models/Vehicle.model');
const Job = require('../models/Job.model');

const {
  addVehicle,
  getMyVehicles,
  getVehicleById,
  updateVehicle,
  deleteVehicle,
  searchVehicle,
  getAllVehiclesAdmin,
  getVehicleHistory,
} = require('../controllers/vehicle.controller');

const app = express();
app.use(express.json());

// Mock Authentication Middleware
const mockUser = {
  _id: 'user123',
  email: 'customer@test.com',
  role: 'customer',
};

app.use((req, res, next) => {
  req.user = mockUser;
  next();
});

// Routes
app.post('/api/vehicles', addVehicle);
app.get('/api/vehicles', getMyVehicles);
app.get('/api/vehicles/:id', getVehicleById);
app.put('/api/vehicles/:id', updateVehicle);
app.delete('/api/vehicles/:id', deleteVehicle);
app.get('/api/vehicles/search/:plate', searchVehicle);
app.get('/api/vehicles/admin/all', getAllVehiclesAdmin);
app.get('/api/vehicles/:id/history', getVehicleHistory);

describe('Vehicle Controller Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================
  // ADD VEHICLE
  // =========================================================
  describe('POST /api/vehicles', () => {
    test('should add vehicle successfully', async () => {
      Vehicle.findOne.mockResolvedValue(null);

      Vehicle.create.mockResolvedValue({
        _id: '1',
        registrationNumber: 'ABC1234',
      });

      const res = await request(app)
        .post('/api/vehicles')
        .send({
          registrationNumber: 'ABC1234',
          brand: 'Toyota',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.message).toContain('Vehicle added');
    });

    test('should return 400 if vehicle already exists', async () => {
      Vehicle.findOne.mockResolvedValue({
        registrationNumber: 'ABC1234',
      });

      const res = await request(app)
        .post('/api/vehicles')
        .send({
          registrationNumber: 'ABC1234',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('Vehicle already registered.');
    });
  });

  // =========================================================
  // GET MY VEHICLES
  // =========================================================
  describe('GET /api/vehicles', () => {
    test('should return user vehicles', async () => {
      const vehicles = [
        { registrationNumber: 'ABC1234' },
      ];

      Vehicle.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(vehicles),
      });

      const res = await request(app).get('/api/vehicles');

      expect(res.statusCode).toBe(200);
      expect(res.body.count).toBe(1);
    });
  });

  // =========================================================
  // GET VEHICLE BY ID
  // =========================================================
  describe('GET /api/vehicles/:id', () => {
    test('should return vehicle details', async () => {
      Vehicle.findById.mockResolvedValue({
        _id: '1',
        owner: 'user123',
      });

      const res = await request(app).get('/api/vehicles/1');

      expect(res.statusCode).toBe(200);
    });

    test('should return 404 if vehicle not found', async () => {
      Vehicle.findById.mockResolvedValue(null);

      const res = await request(app).get('/api/vehicles/999');

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe('Vehicle not found.');
    });

    test('should deny access for non-owner', async () => {
      Vehicle.findById.mockResolvedValue({
        _id: '1',
        owner: {
          toString: () => 'anotherUser',
        },
      });

      const res = await request(app).get('/api/vehicles/1');

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toBe('Access denied.');
    });
  });

  // =========================================================
  // UPDATE VEHICLE
  // =========================================================
  describe('PUT /api/vehicles/:id', () => {
    test('should update vehicle successfully', async () => {
      Vehicle.findById.mockResolvedValue({
        _id: '1',
        owner: {
          toString: () => 'user123',
        },
      });

      Vehicle.findByIdAndUpdate.mockResolvedValue({
        _id: '1',
        brand: 'Honda',
      });

      const res = await request(app)
        .put('/api/vehicles/1')
        .send({
          brand: 'Honda',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('updated successfully');
    });

    test('should return 403 if updating another user vehicle', async () => {
      Vehicle.findById.mockResolvedValue({
        owner: {
          toString: () => 'otherUser',
        },
      });

      const res = await request(app)
        .put('/api/vehicles/1')
        .send({
          brand: 'Honda',
        });

      expect(res.statusCode).toBe(403);
    });
  });

  // =========================================================
  // DELETE VEHICLE
  // =========================================================
  describe('DELETE /api/vehicles/:id', () => {
    test('should delete vehicle successfully', async () => {
      Vehicle.findById.mockResolvedValue({
        owner: {
          toString: () => 'user123',
        },
      });

      Vehicle.findByIdAndDelete.mockResolvedValue(true);

      const res = await request(app)
        .delete('/api/vehicles/1');

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('removed');
    });

    test('should return 403 for unauthorized delete', async () => {
      Vehicle.findById.mockResolvedValue({
        owner: {
          toString: () => 'otherUser',
        },
      });

      const res = await request(app)
        .delete('/api/vehicles/1');

      expect(res.statusCode).toBe(403);
    });
  });

  // =========================================================
  // SEARCH VEHICLE
  // =========================================================
  describe('GET /api/vehicles/search/:plate', () => {
    test('should return matching vehicles', async () => {
      const vehicles = [
        { registrationNumber: 'ABC1234' },
      ];

      Vehicle.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue(vehicles),
      });

      const res = await request(app)
        .get('/api/vehicles/search/ABC');

      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBe(1);
    });

    test('should return 404 if no vehicles found', async () => {
      Vehicle.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue([]),
      });

      const res = await request(app)
        .get('/api/vehicles/search/ZZZ');

      expect(res.statusCode).toBe(404);
    });
  });

  // =========================================================
  // ADMIN GET ALL VEHICLES
  // =========================================================
  describe('GET /api/vehicles/admin/all', () => {
    test('should return all vehicles', async () => {
      const vehicles = [
        { registrationNumber: 'ABC1234' },
      ];

      Vehicle.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue(vehicles),
        }),
      });

      const res = await request(app)
        .get('/api/vehicles/admin/all');

      expect(res.statusCode).toBe(200);
      expect(res.body.count).toBe(1);
    });
  });

  // =========================================================
  // VEHICLE HISTORY
  // =========================================================
  describe('GET /api/vehicles/:id/history', () => {
    test('should return vehicle history', async () => {
      const jobs = [
        {
          _id: 'job1',
        },
      ];

      Job.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockResolvedValue(jobs),
          }),
        }),
      });

      const res = await request(app)
        .get('/api/vehicles/1/history');

      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBe(1);
    });
  });
});