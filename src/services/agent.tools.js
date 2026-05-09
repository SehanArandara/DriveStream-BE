/**
 * DriveStream Agentic Tools
 * 
 * Public-safe database query functions that the AI chatbot can invoke.
 * These tools NEVER expose private user data — only catalog-level information.
 */
const Service = require('../models/Service.model');
const VehicleType = require('../models/VehicleType.model');
const Booking = require('../models/Booking.model');

const DAILY_MAX_MINUTES = 1440; // 3 techs × 8 hrs × 60 mins

// ── Tool Definitions (for the AI to understand what it can call) ──
const TOOL_DEFINITIONS = [
  {
    name: 'get_available_services',
    description: 'Get a list of all available vehicle services with pricing and duration for each vehicle category. Call this when the user asks about services, prices, costs, what you offer, or service packages.',
    parameters: {}
  },
  {
    name: 'get_vehicle_types',
    description: 'Get a list of all supported vehicle categories/types. Call this when the user asks what types of vehicles are supported.',
    parameters: {}
  },
  {
    name: 'check_slot_availability',
    description: 'Check if the workshop has available capacity on a specific date. Call this when the user asks about availability, free slots, or whether they can book on a particular day.',
    parameters: {
      date: 'The date to check in YYYY-MM-DD format'
    }
  },
  {
    name: 'recommend_services',
    description: 'Given a vehicle make/model, recommend the appropriate vehicle category and available services with pricing. Call this when the user mentions a specific car model like Corolla, Civic, Prado, BMW, etc.',
    parameters: {
      vehicleModel: 'The vehicle make or model name mentioned by the user'
    }
  }
];

// ── Tool Implementations ──

const get_available_services = async () => {
  const services = await Service.find({ isAvailable: true }).lean();
  
  if (services.length === 0) return 'No services are currently available.';

  return services.map(s => {
    const configs = s.config.map(c => `  • ${c.category}: LKR ${c.priceLKR.toLocaleString()} (${c.durationMinutes} mins)`).join('\n');
    return `📌 ${s.name}\n   ${s.description}\n${configs}`;
  }).join('\n\n');
};

const get_vehicle_types = async () => {
  const types = await VehicleType.find({ isActive: true }).lean();
  
  if (types.length === 0) return 'No vehicle types are currently registered.';

  return types.map(t => `• ${t.name}: ${t.description}`).join('\n');
};

const check_slot_availability = async (dateStr) => {
  if (!dateStr) return 'Please provide a date to check (e.g., 2026-05-10).';

  // Normalize: replace slashes with dashes so "2026/05/10" works too
  const normalized = String(dateStr).replace(/\//g, '-').trim();
  const date = new Date(normalized);
  if (isNaN(date.getTime())) return `I couldn't understand the date "${dateStr}". Please use a format like 2026-05-10.`;

  // Ensure we query in UTC day boundaries
  const startOfDay = new Date(normalized + 'T00:00:00.000Z');
  const endOfDay   = new Date(normalized + 'T23:59:59.999Z');

  const bookings = await Booking.find({
    date: { $gte: startOfDay, $lte: endOfDay },
    status: { $nin: ['Cancelled'] }
  }).lean();

  const bookedMinutes = bookings.reduce((sum, b) => sum + (b.totalDuration || 0), 0);
  const remainingMinutes = DAILY_MAX_MINUTES - bookedMinutes;
  const remainingHours = (remainingMinutes / 60).toFixed(1);

  const dayName = date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  if (remainingMinutes <= 0) {
    return `❌ Sorry, ${dayName} is fully booked. No slots available. Please try another date.`;
  }

  return `✅ ${dayName} has approximately ${remainingHours} hours (${remainingMinutes} mins) of available workshop capacity. There are currently ${bookings.length} existing booking(s) that day. To book a slot, please register or log in to your DriveStream account!`;
};

const recommend_services = async (vehicleModel) => {
  // Map common vehicle models to DB category names
  const MODEL_CATEGORY_MAP = {
    // Hatchbacks / small cars (map to 'Car' matching updated KB)
    'alto': 'Car', 'swift': 'Car', 'vitz': 'Car', 'fit': 'Car',
    'wagon r': 'Car', 'aqua': 'Car', 'march': 'Car', 'demio': 'Car',
    'mira': 'Car', 'eon': 'Car', 'i10': 'Car', 'i20': 'Car',
    // Sedans (also map to 'Car')
    'corolla': 'Car', 'civic': 'Car', 'axio': 'Car', 'allion': 'Car',
    'premio': 'Car', 'camry': 'Car', 'lancer': 'Car', 'accord': 'Car',
    'grace': 'Car', 'bluebird': 'Car', 'sunny': 'Car', 'tiida': 'Car',
    // Vans
    'hiace': 'Van', 'kdh': 'Van', 'caravan': 'Van', 'delica': 'Van',
    'noah': 'Van', 'voxy': 'Van', 'serena': 'Van',
    // Heavy Trucks
    'lorry': 'Heavy Truck', 'prime mover': 'Heavy Truck', 'fuso': 'Heavy Truck',
    'tata': 'Heavy Truck', 'leyland': 'Heavy Truck', 'isuzu truck': 'Heavy Truck',
    // SUVs
    'prado': 'SUV', 'montero': 'SUV', 'vezel': 'SUV', 'hr-v': 'SUV',
    'rav4': 'SUV', 'x-trail': 'SUV', 'rush': 'SUV', 'fortuner': 'SUV',
    'hilux': 'SUV', 'defender': 'SUV', 'pajero': 'SUV', 'crv': 'SUV',
    'mu-x': 'SUV', 'outlander': 'SUV', 'tucson': 'SUV', 'sportage': 'SUV',
    // Luxury
    'bmw': 'Luxury', 'mercedes': 'Luxury', 'benz': 'Luxury', 'audi': 'Luxury',
    'lexus': 'Luxury', 'jaguar': 'Luxury', 'porsche': 'Luxury', 'volvo': 'Luxury',
    'range rover': 'Luxury', 'land rover': 'Luxury',
  };

  const searchTerm = vehicleModel.toLowerCase().trim();
  let matchedCategory = null;

  for (const [model, category] of Object.entries(MODEL_CATEGORY_MAP)) {
    if (searchTerm.includes(model)) {
      matchedCategory = category;
      break;
    }
  }

  if (!matchedCategory) {
    // Fallback: check if user typed the category name directly (dynamic from DB)
    const types = await VehicleType.find({ isActive: true }).lean();
    const directMatch = types.find(t => searchTerm.includes(t.name.toLowerCase()));
    if (directMatch) matchedCategory = directMatch.name;
  }

  if (!matchedCategory) {
    // Last resort: list all DB categories so user can self-identify
    const types = await VehicleType.find({ isActive: true }).lean();
    const categoryList = types.map(t => t.name).join(', ');
    return `I couldn't identify the category for "${vehicleModel}". Our categories: **${categoryList}**. Which one fits your vehicle?`;
  }

  // Fetch services available for this category
  const services = await Service.find({ 
    isAvailable: true, 
    applicableCategories: matchedCategory 
  }).lean();

  if (services.length === 0) {
    return `Your "${vehicleModel}" falls under the **${matchedCategory}** category, but there are currently no services configured for this category. Please contact us at +94 11 234 5678.`;
  }

  const serviceList = services.map(s => {
    const cfg = s.config.find(c => c.category === matchedCategory);
    if (!cfg) return `• ${s.name} — pricing unavailable for ${matchedCategory}`;
    return `• ${s.name}: LKR ${cfg.priceLKR.toLocaleString()} (${cfg.durationMinutes} mins)`;
  }).join('\n');

  return `🚗 Your "${vehicleModel}" is classified as: **${matchedCategory}**\n\nRecommended services:\n${serviceList}\n\nTo book, please Register or Login to your DriveStream account!`;
};

// ── Tool Executor ──
const TOOL_MAP = {
  get_available_services,
  get_vehicle_types,
  check_slot_availability,
  recommend_services,
};

/**
 * Execute a tool by name with the given arguments.
 */
const executeTool = async (toolName, args = {}) => {
  const fn = TOOL_MAP[toolName];
  if (!fn) return `Unknown tool: ${toolName}`;

  try {
    switch (toolName) {
      case 'check_slot_availability':
        return await fn(args.date);
      case 'recommend_services':
        return await fn(args.vehicleModel);
      default:
        return await fn();
    }
  } catch (err) {
    console.error(`Tool execution error [${toolName}]:`, err.message);
    return `Sorry, I encountered an error while looking that up. Please try again.`;
  }
};

module.exports = { TOOL_DEFINITIONS, executeTool };
