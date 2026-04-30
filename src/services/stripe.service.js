// Stripe Payment Service
let stripeClient;

try {
  const Stripe = require('stripe');
  if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.startsWith('sk_test_your')) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
    console.log('💳 Stripe payment service initialized.');
  } else {
    console.log('💳 Stripe: running in mock mode (no credentials configured).');
  }
} catch (err) {
  console.log('💳 Stripe: not available.');
}

/**
 * Create a Stripe Checkout Session for online payment.
 */
const createCheckoutSession = async ({ amount, customerEmail, description, jobId }) => {
  if (!stripeClient) {
    console.log(`[Stripe Mock] Checkout session for ${customerEmail} — LKR ${amount / 100}`);
    return { id: `mock_session_${Date.now()}`, url: null };
  }

  const session = await stripeClient.checkout.sessions.create({
    payment_method_types: ['card'],
    customer_email:       customerEmail,
    line_items: [
      {
        price_data: {
          currency:     'lkr',
          product_data: { name: description },
          unit_amount:  amount,
        },
        quantity: 1,
      },
    ],
    mode:        'payment',
    success_url: `${process.env.CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${process.env.CLIENT_URL}/payment/cancel`,
    metadata:    { jobId },
  });

  return session;
};

/**
 * Handle Stripe webhook events.
 */
const constructWebhookEvent = (payload, sig) => {
  if (!stripeClient) return null;
  return stripeClient.webhooks.constructEvent(payload, sig, process.env.STRIPE_WEBHOOK_SECRET);
};

module.exports = { createCheckoutSession, constructWebhookEvent };
