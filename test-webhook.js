import stripe from "./src/services/stripeService.js";
import supabase from "./src/services/supabaseClient.js";

// Test function to verify webhook functionality
async function testWebhookFunctionality() {
  console.log("Testing webhook functionality...");

  try {
    // Test 1: Check if we can create a customer
    console.log("\n1. Testing customer creation...");
    const testCustomer = await stripe.customers.create({
      email: "test@example.com",
      metadata: {
        userId: "test-user-id",
        userEmail: "test@example.com",
      },
    });
    console.log("✅ Customer created:", testCustomer.id);

    // Test 2: Check if we can create a subscription
    console.log("\n2. Testing subscription creation...");
    const testSubscription = await stripe.subscriptions.create({
      customer: testCustomer.id,
      items: [{ price: "price_test" }], // You'll need to replace with actual price ID
      metadata: {
        userId: "test-user-id",
        userEmail: "test@example.com",
        plan: "test-plan",
      },
    });
    console.log("✅ Subscription created:", testSubscription.id);

    // Test 3: Check database connection
    console.log("\n3. Testing database connection...");
    const { data, error } = await supabase
      .from("users")
      .select("id, email, stripe_customer_id")
      .limit(1);

    if (error) {
      console.log("❌ Database connection failed:", error);
    } else {
      console.log("✅ Database connection successful");
      console.log("Sample user data:", data);
    }

    // Clean up test data
    console.log("\n4. Cleaning up test data...");
    await stripe.subscriptions.del(testSubscription.id);
    await stripe.customers.del(testCustomer.id);
    console.log("✅ Test data cleaned up");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

// Test function to verify customer ID management
async function testCustomerIdManagement() {
  console.log("\nTesting customer ID management...");

  try {
    // Get a test user from database
    const { data: users, error } = await supabase
      .from("users")
      .select("id, email, stripe_customer_id")
      .limit(1);

    if (error || !users.length) {
      console.log("❌ No users found in database");
      return;
    }

    const testUser = users[0];
    console.log("Testing with user:", testUser.email);

    // Check if user has customer ID
    if (testUser.stripe_customer_id) {
      console.log(
        "✅ User already has customer ID:",
        testUser.stripe_customer_id
      );
    } else {
      console.log("ℹ️ User does not have customer ID, would create one");
    }
  } catch (error) {
    console.error("❌ Customer ID management test failed:", error.message);
  }
}

// Run tests
async function runTests() {
  console.log("🚀 Starting webhook and customer ID tests...\n");

  await testWebhookFunctionality();
  await testCustomerIdManagement();

  console.log("\n✅ All tests completed!");
  process.exit(0);
}

runTests().catch(console.error);
