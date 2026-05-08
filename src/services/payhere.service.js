const crypto = require('crypto');

/**
 * Generate PayHere MD5 Hash
 * @param {string} merchantId 
 * @param {string} orderId 
 * @param {number} amount 
 * @param {string} currency 
 * @param {string} merchantSecret 
 */
const generateHash = (merchantId, orderId, amount, currency, merchantSecret) => {
  const hashedSecret = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
  const amountFormatted = Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, useGrouping: false });
  
  const mainString = merchantId + orderId + amountFormatted + currency + hashedSecret;
  return crypto.createHash('md5').update(mainString).digest('hex').toUpperCase();
};

/**
 * Verify PayHere Notification Hash
 * @param {Object} data - The POST body from PayHere
 * @param {string} merchantSecret 
 */
const verifyNotificationHash = (data, merchantSecret) => {
  const { merchant_id, order_id, payhere_amount, payhere_currency, status_code, md5sig } = data;
  
  const hashedSecret = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
  const amountFormatted = Number(payhere_amount).toLocaleString('en-US', { minimumFractionDigits: 2, useGrouping: false });
  
  const mainString = merchant_id + order_id + amountFormatted + payhere_currency + status_code + hashedSecret;
  const expectedHash = crypto.createHash('md5').update(mainString).digest('hex').toUpperCase();
  
  return expectedHash === md5sig;
};

module.exports = {
  generateHash,
  verifyNotificationHash
};
