import stripe from "../services/stripeService.js";
import supabase from "../services/supabaseClient.js";

export const stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log("Received webhook event:", event.type);

  // Handle the event
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = event.data.object;
      const customerId = subscription.customer;
      const plan =
        subscription.items.data[0].price.nickname ||
        subscription.items.data[0].price.id;
      const status = subscription.status;
      const startDate = new Date(
        subscription.current_period_start * 1000
      ).toISOString();
      const endDate = new Date(
        subscription.current_period_end * 1000
      ).toISOString();

      console.log("Processing subscription:", {
        subscriptionId: subscription.id,
        customerId,
        plan,
        status,
        startDate,
        endDate,
      });

      // Find user by customerId
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id, email")
        .eq("stripe_customer_id", customerId)
        .single();

      if (userError || !userData) {
        console.error("User not found for customerId:", customerId);
        return res.status(400).json({ error: "User not found" });
      }

      // Update or insert subscription info
      const { data: subscriptionData, error: subscriptionError } =
        await supabase
          .from("subscriptions")
          .upsert(
            [
              {
                user_id: userData.id,
                stripe_subscription_id: subscription.id,
                plan,
                status,
                start_date: startDate,
                end_date: endDate,
                updated_at: new Date().toISOString(),
              },
            ],
            {
              onConflict: "stripe_subscription_id",
              ignoreDuplicates: false,
            }
          )
          .select();

      if (subscriptionError) {
        console.error("Error updating subscription:", subscriptionError);
        return res.status(500).json({ error: "Failed to update subscription" });
      }

      console.log("Subscription updated successfully:", subscriptionData);
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      console.log("Processing subscription deletion:", subscription.id);

      // Mark subscription as canceled
      const { error: updateError } = await supabase
        .from("subscriptions")
        .update({
          status: "canceled",
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_subscription_id", subscription.id);

      if (updateError) {
        console.error("Error canceling subscription:", updateError);
        return res.status(500).json({ error: "Failed to cancel subscription" });
      }

      console.log("Subscription canceled successfully");
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object;
      console.log("Processing successful payment for invoice:", invoice.id);

      // Update subscription status to active if payment succeeded
      if (invoice.subscription) {
        const { error: updateError } = await supabase
          .from("subscriptions")
          .update({
            status: "active",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", invoice.subscription);

        if (updateError) {
          console.error("Error updating subscription status:", updateError);
        } else {
          console.log("Subscription status updated to active");
        }
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object;
      console.log("Processing failed payment for invoice:", invoice.id);

      // Update subscription status to past_due if payment failed
      if (invoice.subscription) {
        const { error: updateError } = await supabase
          .from("subscriptions")
          .update({
            status: "past_due",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", invoice.subscription);

        if (updateError) {
          console.error("Error updating subscription status:", updateError);
        } else {
          console.log("Subscription status updated to past_due");
        }
      }
      break;
    }

    case "customer.created": {
      const customer = event.data.object;
      console.log("New customer created:", customer.id);
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
};

export const subscribe = async (req, res) => {
  const { user, plan, paymentMethodId } = req.body;

  try {
    console.log(
      "Starting subscription process for user:",
      user.id,
      "plan:",
      plan
    );

    // 1. Get or create Stripe customer
    let { data: userData, error } = await supabase
      .from("users")
      .select("stripe_customer_id, email")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Error fetching user data:", error);
      return res.status(400).json({ error: "User not found" });
    }

    let customerId = userData?.stripe_customer_id;

    if (!customerId) {
      console.log("Creating new Stripe customer for user:", user.id);
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: userData.email,
        metadata: {
          userId: user.id,
          userEmail: userData.email,
        },
      });
      customerId = customer.id;

      // Save customer ID to Supabase
      const { error: updateError } = await supabase
        .from("users")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);

      if (updateError) {
        console.error("Error saving customer ID:", updateError);
        return res.status(500).json({ error: "Failed to save customer ID" });
      }

      console.log("New customer created and saved:", customerId);
    } else {
      console.log("Using existing customer ID:", customerId);
    }

    // 2. Attach payment method to customer
    console.log("Attaching payment method to customer");
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    // Set as default payment method
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    // 3. Create subscription with metadata
    console.log("Creating subscription");
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: plan }],
      expand: ["latest_invoice.payment_intent"],
      metadata: {
        userId: user.id,
        userEmail: userData.email,
        plan: plan,
      },
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.payment_intent"],
    });

    console.log("Subscription created:", subscription.id);

    // 4. Store subscription info in Supabase (webhook will handle this, but we'll do it here too for immediate access)
    const startDate = new Date(
      subscription.current_period_start * 1000
    ).toISOString();
    const endDate = new Date(
      subscription.current_period_end * 1000
    ).toISOString();

    const { error: insertError } = await supabase.from("subscriptions").insert([
      {
        user_id: user.id,
        stripe_subscription_id: subscription.id,
        plan,
        status: subscription.status,
        start_date: startDate,
        end_date: endDate,
      },
    ]);

    if (insertError) {
      console.error("Error inserting subscription:", insertError);
      // Don't fail the request, webhook will handle it
    }

    console.log("Subscription process completed successfully");
    res.json({
      success: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        customerId: customerId,
      },
    });
  } catch (err) {
    console.error("Subscription error:", err);
    res.status(400).json({ error: err.message });
  }
};

// plan: 'oneday' or 'onemonth', method: 'card' or 'paypal', amount calculated in frontend
export const createPaymentIntent = async (req, res) => {
  const { plan, method, amount, currency, card, paypal_email } = req.body;
  try {
    console.log(
      "Creating payment intent for user:",
      req.user.id,
      "plan:",
      plan
    );

    let paymentMethodTypes = [];
    if (method === "card") paymentMethodTypes = ["card"];
    else if (method === "paypal") paymentMethodTypes = ["paypal"];
    else return res.status(400).json({ error: "Invalid payment method" });

    // Ensure user has a customer ID
    const customerId = await getOrCreateCustomerId(req.user.id);

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: currency || "usd",
      customer: customerId,
      payment_method_types: paymentMethodTypes,
      metadata: {
        user_id: req.user.id,
        plan,
        customer_id: customerId,
      },
      receipt_email: req.user.email,
    });

    console.log("Payment intent created:", paymentIntent.id);
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error("Error creating payment intent:", err);
    res.status(500).json({ error: err.message });
  }
};

// Called after payment confirmation from frontend
export const verifyPayment = async (req, res) => {
  const { paymentIntentId, plan } = req.body;
  try {
    console.log("Verifying payment:", paymentIntentId, "for plan:", plan);

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (paymentIntent.status !== "succeeded") {
      return res.status(400).json({ error: "Payment not successful" });
    }

    // Ensure user has a customer ID
    let customerId = paymentIntent.customer;
    if (!customerId) {
      // Create customer ID if not exists
      customerId = await getOrCreateCustomerId(req.user.id);

      // Update payment intent with customer ID
      await stripe.paymentIntents.update(paymentIntentId, {
        customer: customerId,
      });
    }

    // Calculate subscription duration
    let duration = 0;
    if (plan === "oneday") duration = 1;
    else if (plan === "onemonth") duration = 30;
    else return res.status(400).json({ error: "Invalid plan" });

    const now = new Date();
    const end_date = new Date(now.getTime() + duration * 24 * 60 * 60 * 1000);

    // Insert subscription record
    const { error: insertError } = await supabase.from("subscriptions").insert([
      {
        user_id: req.user.id,
        plan,
        status: "active",
        start_date: now.toISOString(),
        end_date: end_date.toISOString(),
        payment_intent_id: paymentIntentId,
        stripe_customer_id: customerId,
      },
    ]);

    if (insertError) {
      console.error("Error inserting subscription:", insertError);
      return res.status(500).json({ error: "Failed to save subscription" });
    }

    console.log("Payment verified and subscription created successfully");
    res.json({ success: true, customerId });
  } catch (err) {
    console.error("Payment verification error:", err);
    res.status(500).json({ error: err.message });
  }
};

export const getUserSubscription = async (req, res) => {
  const userId = req.user.id; // assuming you have auth middleware
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .order("end_date", { ascending: false })
    .limit(1)
    .single();

  if (error) return res.status(404).json({ error: "No subscription found" });
  res.json(data);
};

export const requireActiveSubscription = async (req, res, next) => {
  const userId = req.user.id;
  const { data, error } = await supabase
    .from("subscriptions")
    .select("status, end_date")
    .eq("user_id", userId)
    .order("end_date", { ascending: false })
    .limit(1)
    .single();

  if (error || !data)
    return res.status(403).json({ error: "No active subscription" });

  const now = new Date();
  const endDate = new Date(data.end_date);
  if (data.status !== "active" || now > endDate) {
    return res.status(401).json({ error: "Subscription inactive or expired" });
  }
  next();
};

// Helper function to get or create customer ID
export const getOrCreateCustomerId = async (userId) => {
  try {
    // Check if user already has a customer ID
    const { data: userData, error } = await supabase
      .from("users")
      .select("stripe_customer_id, email")
      .eq("id", userId)
      .single();

    if (error) {
      throw new Error("User not found");
    }

    // If user already has a customer ID, return it
    if (userData.stripe_customer_id) {
      return userData.stripe_customer_id;
    }

    // Create new customer in Stripe
    const customer = await stripe.customers.create({
      email: userData.email,
      metadata: {
        userId: userId,
        userEmail: userData.email,
      },
    });

    // Save customer ID to database
    const { error: updateError } = await supabase
      .from("users")
      .update({ stripe_customer_id: customer.id })
      .eq("id", userId);

    if (updateError) {
      throw new Error("Failed to save customer ID");
    }

    return customer.id;
  } catch (error) {
    console.error("Error in getOrCreateCustomerId:", error);
    throw error;
  }
};

// Function to sync customer data with Stripe
export const syncCustomerData = async (req, res) => {
  try {
    const userId = req.user.id;
    const customerId = await getOrCreateCustomerId(userId);

    res.json({
      success: true,
      customerId: customerId,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
