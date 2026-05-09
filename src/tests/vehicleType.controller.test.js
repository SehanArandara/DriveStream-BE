// tests/vehicleType.controller.test.js

const request = require('supertest');
const express = require('express');

jest.mock('../models/VehicleType.model', () => ({
  create: jest.fn(),
  find: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findById: jest.fn(),
}));

const VehicleType = require('../models/VehicleType.model');

const {
  createType,
  getTypes,
  updateType,
  toggleType,
} = require('../controllers/vehicleType.controller');

const app = express();
app.use(express.json());

// Routes
app.post('/api/vehicle-types', createType);
app.get('/api/vehicle-types', getTypes);
app.put('/api/vehicle-types/:id', updateType);
app.patch('/api/vehicle-types/:id/toggle', toggleType);

describe('Vehicle Type Controller Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================
  // CREATE TYPE
  // =========================================================
  describe('POST /api/vehicle-types', () => {
    test('should create vehicle type successfully', async () => {
      const mockType = {
        _id: '1',
        name: 'SUV',
        isActive: true,
      };

      VehicleType.create.mockResolvedValue(mockType);

      const res = await request(app)
        .post('/api/vehicle-types')
        .send({
          name: 'SUV',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.name).toBe('SUV');

      expect(VehicleType.create).toHaveBeenCalledWith({
        name: 'SUV',
      });
    });

    test('should return 400 on create error', async () => {
      VehicleType.create.mockRejectedValue(
        new Error('Validation failed')
      );

      const res = await request(app)
        .post('/api/vehicle-types')
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('Validation failed');
    });
  });

  // =========================================================
  // GET TYPES
  // =========================================================
  describe('GET /api/vehicle-types', () => {
    test('should return all active vehicle types', async () => {
      const mockTypes = [
        {
          _id: '1',
          name: 'Car',
          isActive: true,
        },
        {
          _id: '2',
          name: 'Van',
          isActive: true,
        },
      ];

      VehicleType.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockTypes),
      });

      const res = await request(app).get('/api/vehicle-types');

      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBe(2);

      expect(VehicleType.find).toHaveBeenCalledWith({
        isActive: true,
      });
    });

    test('should return 500 on fetch error', async () => {
      VehicleType.find.mockImplementation(() => {
        throw new Error('Database Error');
      });

      const res = await request(app).get('/api/vehicle-types');

      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe('Database Error');
    });
  });

  // =========================================================
  // UPDATE TYPE
  // =========================================================
  describe('PUT /api/vehicle-types/:id', () => {
    test('should update vehicle type successfully', async () => {
      const updatedType = {
        _id: '1',
        name: 'Updated SUV',
        isActive: true,
      };

      VehicleType.findByIdAndUpdate.mockResolvedValue(updatedType);

      const res = await request(app)
        .put('/api/vehicle-types/1')
        .send({
          name: 'Updated SUV',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.name).toBe('Updated SUV');

      expect(VehicleType.findByIdAndUpdate).toHaveBeenCalledWith(
        '1',
        { name: 'Updated SUV' },
        { new: true }
      );
    });

    test('should return 400 on update error', async () => {
      VehicleType.findByIdAndUpdate.mockRejectedValue(
        new Error('Update failed')
      );

      const res = await request(app)
        .put('/api/vehicle-types/1')
        .send({
          name: 'SUV',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('Update failed');
    });
  });

  // =========================================================
  // TOGGLE TYPE
  // =========================================================
  describe('PATCH /api/vehicle-types/:id/toggle', () => {
    test('should toggle vehicle type status', async () => {
      const mockType = {
        _id: '1',
        name: 'SUV',
        isActive: true,
        save: jest.fn().mockResolvedValue(true),
      };

      VehicleType.findById.mockResolvedValue(mockType);

      const res = await request(app)
        .patch('/api/vehicle-types/1/toggle');

      expect(res.statusCode).toBe(200);

      expect(mockType.isActive).toBe(false);

      expect(mockType.save).toHaveBeenCalled();
    });

    test('should return 500 on toggle error', async () => {
      VehicleType.findById.mockRejectedValue(
        new Error('Toggle failed')
      );

      const res = await request(app)
        .patch('/api/vehicle-types/1/toggle');

      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe('Toggle failed');
    });
  });
});