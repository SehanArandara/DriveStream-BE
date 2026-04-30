const router   = require('express').Router();
const Invoice  = require('../models/Invoice.model');
const { constructWebhookEvent } = require('../services/stripe.service');
const { protect } = require('../middleware/auth.middleware');

// Stripe Webhook — raw body needed
router.post('/webhook', require('express').raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = constructWebhookEvent(req.body, sig);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (!event) return res.json({ received: true, mock: true });

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    await Invoice.findOneAndUpdate(
      { stripePaymentIntentId: session.id },
      { status: 'paid', paidAt: new Date(), paidAmount: session.amount_total / 100, paymentMethod: 'online' }
    );
  }

  res.json({ received: true });
});

// GET payment status for a job
router.get('/status/:invoiceId', protect, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.invoiceId).select('status paidAt totalAmount stripePaymentUrl');
    if (!invoice) return res.status(404).json({ message: 'Invoice not found.' });
    res.json({ invoice });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
