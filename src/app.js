import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/user.js";
import paymentRoutes from "./routes/payment.js";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: "*",
    // origin: [
      // "*"
      // "http://localhost:5173/",
      // "https://groove-kappa.vercel.app/"
    // ],
    // credentials: true,
    // methods: [
    //   "GET",
    //   "HEAD",
    //   "PUT",
    //   "PATCH",
    //   "POST",
    //   "DELETE",
    //   "OPTIONS"
    // ],
    // allowedHeaders: [
    //   "Content-Type",
    //   "Authorization",
    //   "X-Requested-With",
    //   "Accept",
    //   "Origin"
    // ],
  })
);

app.use(express.json());
app.use(cookieParser());

app.use("/auth", authRoutes);
app.use("/user", userRoutes);
app.use("/payment", paymentRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

export default app;
