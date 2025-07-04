import Stripe from "stripe";

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5cXZuempzaXpweHZvcHFna2VqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTMyMzgyMywiZXhwIjoyMDY2ODk5ODIzfQ.OSt-yiC8HwJtg1t3pdlce-fVyTah0rgPgJFrytZOr0k",
  {
    apiVersion: "2023-10-16",
  }
);

export default stripe;
