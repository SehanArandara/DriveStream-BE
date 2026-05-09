// tests/booking.controller.test.js

const request = require('supertest');
const express = require('express');

jest.mock('../models/Booking.model', () => ({
  find: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
}));

jest.mock('../models/Service.model', () => ({
  find: jest.fn(),
}));

jest.mock('../models/Vehicle.model', () => ({
  findById: jest.fn(),
}));

const Booking = require('../models/Booking.model');
const Service = require('../models/Service.model');
const Vehicle = require('../models/Vehicle.model');

const {
  checkAvailability,
  createBooking,
  getMyBookings,
  getBookingById,
} = require('../controllers/booking.controller');

const app = express();
app.use(express.json());

// Mock auth user
app.use((req, res, next) => {
  req.user = {
    _id: 'user123',
    role: 'customer',
  };
  next();
});

// Routes
app.get('/api/bookings/check-availability', checkAvailability);
app.post('/api/bookings', createBooking);
app.get('/api/bookings/my', getMyBookings);
app.get('/api/bookings/:id', getBookingById);

describe('Booking Controller Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================
  // CHECK AVAILABILITY
  // =========================================================
  describe('GET /api/bookings/check-availability', () => {
    test('should return availability status', async () => {
      Booking.find.mockResolvedValue([
        { totalDuration: 200 },
        { totalDuration: 300 },
      ]);

      const res = await request(app)
        .get('/api/bookings/check-availability')
        .query({
          date: '2026-05-09',
          duration: 100,
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.isAvailable).toBe(true);
      expect(res.body.bookedMinutes).toBe(500);
    });

    test('should return 400 if missing params', async () => {
      const res = await request(app)
        .get('/api/bookings/check-availability');

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('Date and duration are required');
    });
  });

  // =========================================================
  // CREATE BOOKING
  // =========================================================
  describe('POST /api/bookings', () => {
    test('should create booking successfully', async () => {
      Vehicle.findById.mockResolvedValue({
        _id: 'vehicle1',
        category: 'Car',
      });

      Service.find.mockResolvedValue([
        {
          _id: 'service1',
          name: 'Oil Change',
          config: [
            {
              category: 'Car',
              durationMinutes: 60,
              priceLKR: 5000,
            },
          ],
        },
      ]);

      Booking.find.mockResolvedValue([]);

      Booking.create.mockResolvedValue({
        _id: 'booking1',
      });

      const res = await request(app)
        .post('/api/bookings')
        .send({
          vehicleId: 'vehicle1',
          serviceIds: ['service1'],
          date: '2026-05-09',
        });

      expect(res.statusCode).toBe(201);
      expect(Booking.create).toHaveBeenCalled();
    });

    test('should return 404 if vehicle not found', async () => {
      Vehicle.findById.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/bookings')
        .send({
          vehicleId: 'vehicle1',
          serviceIds: [],
          date: '2026-05-09',
        });

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe('Vehicle not found');
    });

    test('should fail if capacity exceeded', async () => {
      Vehicle.findById.mockResolvedValue({
        _id: 'vehicle1',
        category: 'Car',
      });

      Service.find.mockResolvedValue([
        {
          _id: 'service1',
          name: 'Repair',
          config: [
            {
              category: 'Car',
              durationMinutes: 2000,
              priceLKR: 10000,
            },
          ],
        },
      ]);

      Booking.find.mockResolvedValue([
        { totalDuration: 1440 }, // full capacity already used
      ]);

      const res = await request(app)
        .post('/api/bookings')
        .send({
          vehicleId: 'vehicle1',
          serviceIds: ['service1'],
          date: '2026-05-09',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/Capacity exceeded/);
    });
  });

  // =========================================================
  // GET MY BOOKINGS
  // =========================================================
  describe('GET /api/bookings/my', () => {
    test('should return customer bookings', async () => {
      const bookings = [
        { _id: 'b1' },
      ];

      Booking.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockResolvedValue(bookings),
          }),
        }),
      });

      const res = await request(app)
        .get('/api/bookings/my');

      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBe(1);

      expect(Booking.find).toHaveBeenCalledWith({
        customer: 'user123',
      });
    });

    test('should return 500 on error', async () => {
      Booking.find.mockImplementation(() => {
        throw new Error('DB Error');
      });

      const res = await request(app)
        .get('/api/bookings/my');

      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe('DB Error');
    });
  });

  // =========================================================
  // GET BOOKING BY ID
  // =========================================================
  describe('GET /api/bookings/:id', () => {
    test('should return booking details', async () => {
      Booking.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue({
            _id: 'booking1',
            customer: {
              _id: {
                toString: () => 'user123',
              },
            },
          }),
        }),
      });

      const res = await request(app)
        .get('/api/bookings/booking1');

      expect(res.statusCode).toBe(200);
    });

    test('should return 404 if booking not found', async () => {
      Booking.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(null),
        }),
      });

      const res = await request(app)
        .get('/api/bookings/booking1');

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe('Booking not found');
    });

    test('should return 403 if access denied', async () => {
      Booking.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue({
            customer: {
              _id: {
                toString: () => 'anotherUser',
              },
            },
          }),
        }),
      });

      const res = await request(app)
        .get('/api/bookings/booking1');

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toBe('Access denied');
    });
  });
});