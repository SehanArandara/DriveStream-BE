/**
 * DriveStream SMS Service
 * Handles SMS dispatching with a Mock mode for Localhost testing.
 */

const sendSMS = async (to, message) => {
  const isDev = process.env.NODE_ENV === 'development' || !process.env.SMS_API_KEY;

  if (isDev) {
    // --- MOCK SMS LOGGER (For Localhost Testing) ---
    console.log('\n' + '='.repeat(50));
    console.log('📱 [MOCK SMS SENT]');
    console.log(`TO: ${to}`);
    console.log(`MESSAGE: ${message}`);
    console.log('='.repeat(50) + '\n');
    return { success: true, messageId: 'mock_' + Date.now() };
  }

  // --- PRODUCTION API LOGIC (e.g., Twilio / Notify.lk) ---
  try {
    // This is where we will integrate the actual API later.
    // For now, it defaults to the mock logger if no API key is found.
    console.log(`Actually sending SMS to ${to}...`);
    return { success: true };
  } catch (error) {
    console.error('SMS Dispatch Error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Pre-defined Templates for consistency
 */
const templates = {
  BOOKING_CONFIRMED: (vehicle, date, time) => 
    `Confirmed! Your service for ${vehicle} is scheduled for ${date} at ${time}. - DriveStream`,
  
  BOOKING_CANCELLED: (vehicle, date) => 
    `Your appointment for ${vehicle} on ${date} has been cancelled. Please contact us for more info.`,

  SERVICE_STARTED: (vehicle, trackingUrl) => 
    `Good news! Your ${vehicle} is now in the workshop. Track live progress here: ${trackingUrl}`,

  SERVICE_COMPLETED: (vehicle, amount) => 
    `Your ${vehicle} is ready for pickup! Total: LKR ${amount}. See you soon! - DriveStream`,

  PAYMENT_RECEIVED: (amount, invoiceNo) => 
    `Payment of LKR ${amount} received for Invoice #${invoiceNo}. Thank you for choosing DriveStream!`
};

module.exports = { sendSMS, templates };
