import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import runMigrations from "./migrate.js";
import app from "./app.js";

// Load environment variables from .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, "..", ".env") });

// runMigrations().then(() => {
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log("Environment variables loaded:", {
    NODE_ENV: process.env.NODE_ENV,
    SUPABASE_URL: process.env.SUPABASE_URL ? "Set" : "Not set",
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ? "Set" : "Not set",
    JWT_SECRET: process.env.JWT_SECRET ? "Set" : "Not set",
  });
});
// });
