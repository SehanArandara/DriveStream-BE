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
 * Send an SMS message.
 * @param {string} to   - Recipient phone number
 * @param {string} body - Message text
 */
const sendSMS = async (to, body) => {
  if (!to) {
    console.log(`[SMS Mock] No phone number provided. Message: "${body}"`);
    return { mock: true };
  }

  // --- MOCK MODE (Console Logging) ---
  if (!twilioClient) {
    console.log('\n' + '='.repeat(40));
    console.log('📱 [MOCK SMS SENT]');
    console.log(`TO: ${to}`);
    console.log(`MSG: ${body}`);
    console.log('='.repeat(40) + '\n');
    return { mock: true, to, body };
  }

  // --- PRODUCTION (Twilio) ---
  try {
    const message = await twilioClient.messages.create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to,
    });
    console.log(`[SMS Sent] SID: ${message.sid} | TO: ${to}`);
    return message;
  } catch (err) {
    console.error('Twilio Send Error:', err.message);
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
