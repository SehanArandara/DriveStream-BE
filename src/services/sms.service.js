// Twilio SMS Service
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
 * @param {string} to   - Recipient phone number (E.164 format, e.g. "+94711234567")
 * @param {string} body - Message text
 */
const sendSMS = async (to, body) => {
  if (!to) {
    console.log(`[SMS Mock] No phone number provided. Message: "${body}"`);
    return { mock: true };
  }

  if (!twilioClient) {
    console.log(`[SMS Mock] TO: ${to} | MSG: ${body}`);
    return { mock: true, to, body };
  }

  const message = await twilioClient.messages.create({
    body,
    from: process.env.TWILIO_PHONE_NUMBER,
    to,
  });

  console.log(`[SMS Sent] SID: ${message.sid} | TO: ${to}`);
  return message;
};

module.exports = { sendSMS };
