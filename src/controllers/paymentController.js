import stripe from '../services/stripeService.js';
import supabase from '../services/supabaseClient.js';

// plan: 'oneday' or 'onemonth', method: 'card' or 'paypal', amount calculated in frontend
export async function createPaymentIntent(req, res) {
  const { plan, method, amount, currency, card, paypal_email } = req.body;
  try {
    let paymentMethodTypes = [];
    if (method === 'card') paymentMethodTypes = ['card'];
    else if (method === 'paypal') paymentMethodTypes = ['paypal'];
    else return res.status(400).json({ error: 'Invalid payment method' });

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: currency || 'usd',
      payment_method_types: paymentMethodTypes,
      metadata: { user_id: req.user.id, plan },
      receipt_email: req.user.email,
    });
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Called after payment confirmation from frontend
export async function verifyPayment(req, res) {
  const { paymentIntentId, plan } = req.body;
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ error: 'Payment not successful' });
    }
    // Update subscription in Supabase
    let duration = 0;
    if (plan === 'oneday') duration = 1;
    else if (plan === 'onemonth') duration = 30;
    else return res.status(400).json({ error: 'Invalid plan' });
    const now = new Date();
    const end_date = new Date(now.getTime() + duration * 24 * 60 * 60 * 1000);
    await supabase.from('subscriptions').insert([
      {
        user_id: req.user.id,
        plan,
        status: 'active',
        start_date: now.toISOString(),
        end_date: end_date.toISOString(),
        payment_intent_id: paymentIntentId,
      },
    ]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
} 