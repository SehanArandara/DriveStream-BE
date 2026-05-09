// tests/invoice.controller.test.js

const request = require('supertest');
const express = require('express');

jest.mock('../models/Invoice.model', () => ({
  find: jest.fn(),
  findById: jest.fn(),
}));

jest.mock('../services/sms.service', () => ({
  sendSMS: jest.fn(),
  templates: {
    PAYMENT_RECEIVED: jest.fn(() => 'PAYMENT_RECEIVED_SMS'),
  },
}));

const Invoice = require('../models/Invoice.model');

const {
  getMyInvoices,
  getAllInvoices,
  markAsPaid,
} = require('../controllers/invoice.controller');

const app = express();
app.use(express.json());

// Mock Auth Middleware
app.use((req, res, next) => {
  req.user = {
    _id: 'user123',
    role: 'customer',
  };
  next();
});

// Routes
app.get('/api/invoices/my', getMyInvoices);
app.get('/api/invoices', getAllInvoices);
app.patch('/api/invoices/:id/pay', markAsPaid);

describe('Invoice Controller Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================
  // GET MY INVOICES
  // =========================================================
  describe('GET /api/invoices/my', () => {
    test('should return customer invoices', async () => {
      const invoices = [
        {
          _id: '1',
          invoiceNumber: 'INV001',
        },
      ];

      Invoice.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              populate: jest.fn().mockReturnValue({
                sort: jest.fn().mockResolvedValue(invoices),
              }),
            }),
          }),
        }),
      });

      const res = await request(app)
        .get('/api/invoices/my');

      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBe(1);

      expect(Invoice.find).toHaveBeenCalledWith({
        customer: 'user123',
      });
    });

    test('should return 500 on database error', async () => {
      Invoice.find.mockImplementation(() => {
        throw new Error('Database Error');
      });

      const res = await request(app)
        .get('/api/invoices/my');

      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe('Database Error');
    });
  });

  // =========================================================
  // GET ALL INVOICES
  // =========================================================
  describe('GET /api/invoices', () => {
    test('should return all invoices', async () => {
      const invoices = [
        {
          _id: '1',
          invoiceNumber: 'INV001',
        },
      ];

      Invoice.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockResolvedValue(invoices),
          }),
        }),
      });

      const res = await request(app)
        .get('/api/invoices');

      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBe(1);
    });

    test('should return 500 on fetch error', async () => {
      Invoice.find.mockImplementation(() => {
        throw new Error('Fetch Error');
      });

      const res = await request(app)
        .get('/api/invoices');

      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe('Fetch Error');
    });
  });

  // =========================================================
  // MARK AS PAID
  // =========================================================
  describe('PATCH /api/invoices/:id/pay', () => {
    test('should mark invoice as paid', async () => {
      const invoice = {
        _id: '1',
        grandTotal: 15000,
        invoiceNumber: 'INV001',
        isPaid: false,
        save: jest.fn(),
      };

      const populatedInvoice = {
        customer: {
          phone: '0771234567',
        },
      };

      Invoice.findById
        .mockResolvedValueOnce(invoice)
        .mockReturnValueOnce({
          populate: jest.fn().mockResolvedValue(populatedInvoice),
        });

      const res = await request(app)
        .patch('/api/invoices/1/pay')
        .send({
          paymentMethod: 'Card',
        });

      expect(res.statusCode).toBe(200);

      expect(invoice.isPaid).toBe(true);
      expect(invoice.paymentMethod).toBe('Card');

      expect(invoice.save).toHaveBeenCalled();
    });

    test('should return 404 if invoice not found', async () => {
      Invoice.findById.mockResolvedValue(null);

      const res = await request(app)
        .patch('/api/invoices/999/pay');

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe('Invoice not found');
    });

    test('should return 400 on payment error', async () => {
      Invoice.findById.mockRejectedValue(
        new Error('Payment Failed')
      );

      const res = await request(app)
        .patch('/api/invoices/1/pay');

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('Payment Failed');
    });
  });
});