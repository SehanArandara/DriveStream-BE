require('dotenv').config();
const mongoose = require('mongoose');
const Service = require('./src/models/Service.model');

const seedServices = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB to seed full enterprise catalog...');

    const baselineServices = [
      // ... (Keep the previous 7 services here) ...
      {
        name: "Full Service",
        description: "Comprehensive package: Oil change, filters, undercarriage wash, and 50-point safety check.",
        applicableCategories: ["Car", "SUV", "Van", "Heavy Truck"],
        config: [
          { category: "Car", durationMinutes: 180, priceLKR: 15000 },
          { category: "SUV", durationMinutes: 240, priceLKR: 22000 },
          { category: "Van", durationMinutes: 300, priceLKR: 28000 },
          { category: "Heavy Truck", durationMinutes: 480, priceLKR: 75000 }
        ]
      },
      {
        name: "Oil Change & Filter",
        description: "Standard engine oil replacement and filter maintenance.",
        applicableCategories: ["Car", "SUV", "Van", "Motorbike", "Heavy Truck"],
        config: [
          { category: "Car", durationMinutes: 60, priceLKR: 8500 },
          { category: "SUV", durationMinutes: 90, priceLKR: 12000 },
          { category: "Motorbike", durationMinutes: 45, priceLKR: 4500 },
          { category: "Heavy Truck", durationMinutes: 180, priceLKR: 45000 }
        ]
      },
      {
        name: "Exterior Detail & Wash",
        description: "High-pressure wash, undercarriage cleaning, and interior vacuuming.",
        applicableCategories: ["Car", "SUV", "Van", "Motorbike", "Heavy Truck"],
        config: [
          { category: "Car", durationMinutes: 45, priceLKR: 2500 },
          { category: "SUV", durationMinutes: 60, priceLKR: 3500 },
          { category: "Motorbike", durationMinutes: 30, priceLKR: 1200 },
          { category: "Heavy Truck", durationMinutes: 120, priceLKR: 15000 }
        ]
      },
      {
        name: "Brake Inspection & Cleaning",
        description: "Cleaning and adjusting brake pads/shoes for optimal safety.",
        applicableCategories: ["Car", "SUV", "Van", "Heavy Truck"],
        config: [
          { category: "Car", durationMinutes: 90, priceLKR: 5000 },
          { category: "SUV", durationMinutes: 90, priceLKR: 6500 },
          { category: "Van", durationMinutes: 120, priceLKR: 8000 },
          { category: "Heavy Truck", durationMinutes: 240, priceLKR: 25000 }
        ]
      },
      {
        name: "Wheel Alignment & Balancing",
        description: "Precision laser alignment and computerized wheel balancing.",
        applicableCategories: ["Car", "SUV", "Van", "Heavy Truck"],
        config: [
          { category: "Car", durationMinutes: 60, priceLKR: 4500 },
          { category: "SUV", durationMinutes: 75, priceLKR: 6000 },
          { category: "Van", durationMinutes: 75, priceLKR: 7000 },
          { category: "Heavy Truck", durationMinutes: 180, priceLKR: 20000 }
        ]
      },
      {
        name: "Hybrid System Health Check",
        description: "Computerized diagnostic of the hybrid battery, motors, and cooling system.",
        applicableCategories: ["Car", "SUV"],
        config: [
          { category: "Car", durationMinutes: 120, priceLKR: 7500 },
          { category: "SUV", durationMinutes: 120, priceLKR: 9500 }
        ]
      },
      {
        name: "Engine Tune-up & Scan",
        description: "Full electronic diagnostic scan and engine optimization.",
        applicableCategories: ["Car", "SUV", "Van", "Motorbike", "Heavy Truck"],
        config: [
          { category: "Car", durationMinutes: 90, priceLKR: 6000 },
          { category: "SUV", durationMinutes: 90, priceLKR: 8000 },
          { category: "Motorbike", durationMinutes: 60, priceLKR: 3500 },
          { category: "Heavy Truck", durationMinutes: 150, priceLKR: 18000 }
        ]
      },
      {
        name: "Air Conditioning (AC) Service",
        description: "AC gas recharging, cabin filter replacement, and leak detection test.",
        applicableCategories: ["Car", "SUV", "Van", "Heavy Truck"],
        config: [
          { category: "Car", durationMinutes: 90, priceLKR: 8500 },
          { category: "SUV", durationMinutes: 120, priceLKR: 10500 },
          { category: "Van", durationMinutes: 120, priceLKR: 12000 },
          { category: "Heavy Truck", durationMinutes: 180, priceLKR: 25000 }
        ]
      },
      {
        name: "Transmission Fluid Flush",
        description: "Replacing automatic or manual gearbox fluid and checking for metal debris.",
        applicableCategories: ["Car", "SUV", "Van", "Heavy Truck"],
        config: [
          { category: "Car", durationMinutes: 120, priceLKR: 18000 },
          { category: "SUV", durationMinutes: 150, priceLKR: 25000 },
          { category: "Heavy Truck", durationMinutes: 300, priceLKR: 55000 }
        ]
      },
      {
        name: "Radiator & Cooling System Flush",
        description: "Draining old coolant, pressure testing for leaks, and refilling with premium coolant.",
        applicableCategories: ["Car", "SUV", "Van", "Heavy Truck"],
        config: [
          { category: "Car", durationMinutes: 75, priceLKR: 6500 },
          { category: "SUV", durationMinutes: 90, priceLKR: 8500 },
          { category: "Heavy Truck", durationMinutes: 180, priceLKR: 22000 }
        ]
      },
      {
        name: "Battery Health Test & Replacement",
        description: "Checking voltage, cold cranking amps (CCA), and cleaning terminals.",
        applicableCategories: ["Car", "SUV", "Van", "Motorbike", "Heavy Truck"],
        config: [
          { category: "Car", durationMinutes: 30, priceLKR: 1500 },
          { category: "Motorbike", durationMinutes: 20, priceLKR: 800 },
          { category: "Heavy Truck", durationMinutes: 60, priceLKR: 5000 }
        ]
      },
      {
        name: "Interior Deep Cleaning & Sanitization",
        description: "Steam cleaning upholstery, carpet shampooing, and dashboard conditioning.",
        applicableCategories: ["Car", "SUV", "Van", "Heavy Truck"],
        config: [
          { category: "Car", durationMinutes: 180, priceLKR: 12000 },
          { category: "SUV", durationMinutes: 240, priceLKR: 16000 },
          { category: "Van", durationMinutes: 300, priceLKR: 20000 }
        ]
      },
      {
        name: "Full Body Wax & Ceramic Coat",
        description: "Paint decontamination, machine polish, and protective ceramic coating application.",
        applicableCategories: ["Car", "SUV", "Motorbike"],
        config: [
          { category: "Car", durationMinutes: 360, priceLKR: 45000 },
          { category: "SUV", durationMinutes: 480, priceLKR: 65000 },
          { category: "Motorbike", durationMinutes: 180, priceLKR: 15000 }
        ]
      },
      {
        name: "Shock Absorber & Suspension Repair",
        description: "Inspection of struts, bushings, and replacement of worn suspension components.",
        applicableCategories: ["Car", "SUV", "Van", "Heavy Truck"],
        config: [
          { category: "Car", durationMinutes: 180, priceLKR: 10000 },
          { category: "SUV", durationMinutes: 240, priceLKR: 15000 },
          { category: "Heavy Truck", durationMinutes: 600, priceLKR: 85000 }
        ]
      },
      {
        name: "Chain/Belt Adjustment & Lube",
        description: "Strictly for motorcycles: tightening the drive chain and applying high-grade lubricant.",
        applicableCategories: ["Motorbike"],
        config: [
          { category: "Motorbike", durationMinutes: 30, priceLKR: 1500 }
        ]
      }
    ];

    await Service.deleteMany({});
    await Service.insertMany(baselineServices);

    console.log('🚀 SUCCESS: 15 Specialized Services Seeded across 5 Vehicle Categories!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding services:', err.message);
    process.exit(1);
  }
};

seedServices();