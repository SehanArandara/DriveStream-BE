// DriveStream SMS Service with Templates and Twilio Support
let twilioClient;

try {
  const twilio = require('twilio');
  if (
    process.env.TWILIO_ACCOUNT_SID &&
    !process.env.TWILIO_ACCOUNT_SID.startsWith('your_') &&
    process.env.TWILIO_AUTH_TOKEN &&
    !process.env.TWILIO_AUTH_TOKEN.startsWith('your_')
  ) {
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    console.log('📱 Twilio SMS service initialized.');
  } else {
    console.log('📱 Twilio SMS: running in mock mode (no credentials configured).');
  }
} catch (err) {
  console.log('📱 Twilio SMS: not available.');
}

/**
 * Send a WhatsApp message (reusing the sendSMS name for compatibility).
 * @param {string} to   - Recipient phone number (e.g., 0771234567)
 * @param {string} body - Message text
 */
const sendSMS = async (to, body) => {
  if (!to) {
    console.log(`[WhatsApp Mock] No phone number provided. Message: "${body}"`);
    return { mock: true };
  }

  // Helper to ensure E.164 format and add whatsapp: prefix
  let formattedTo = to.trim();
  if (formattedTo.startsWith('0')) {
    formattedTo = '+94' + formattedTo.substring(1);
  } else if (!formattedTo.startsWith('+')) {
    formattedTo = '+' + formattedTo;
  }
  
  const whatsappTo = `whatsapp:${formattedTo}`;
  const whatsappFrom = `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`; // Use your Sandbox number here

  // --- MOCK MODE ---
  if (!twilioClient) {
    console.log('\n' + '='.repeat(40));
    console.log('🟢 [MOCK WHATSAPP SENT]');
    console.log(`TO: ${whatsappTo}`);
    console.log(`FROM: ${whatsappFrom}`);
    console.log(`MSG: ${body}`);
    console.log('='.repeat(40) + '\n');
    return { mock: true, to: whatsappTo, body };
  }

  // --- PRODUCTION (Twilio WhatsApp) ---
  try {
    const message = await twilioClient.messages.create({
      body,
      from: whatsappFrom,
      to: whatsappTo,
    });
    console.log(`[WhatsApp Sent] SID: ${message.sid} | TO: ${whatsappTo}`);
    return message;
  } catch (err) {
    console.error('Twilio WhatsApp Error:', err.message);
    return { error: err.message };
  }
};

/**
 * Standardized Message Templates
 */
const templates = {
  BOOKING_CONFIRMED: (vehicle, date, time) => 
    `Confirmed! Your service for ${vehicle} is scheduled for ${date} at ${time}. - DriveStream`,
  
  BOOKING_CANCELLED: (vehicle, date) => 
    `Your appointment for ${vehicle} on ${date} has been cancelled. Contact us for info.`,

  SERVICE_STARTED: (vehicle, trackingUrl) => 
    `Good news! Your ${vehicle} is now in the workshop. Track live progress here: ${trackingUrl}`,

  SERVICE_COMPLETED: (vehicle, amount) => 
    `Your ${vehicle} is ready for pickup! Total: LKR ${amount}. See you soon! - DriveStream`,

  PAYMENT_RECEIVED: (amount, invoiceNo) => 
    `Payment of LKR ${amount} received for Invoice #${invoiceNo}. Thank you for choosing DriveStream!`
};

module.exports = { sendSMS, templates };
