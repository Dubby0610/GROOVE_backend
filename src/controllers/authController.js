import { validationResult } from "express-validator";
import bcrypt from "bcryptjs";
import supabase from "../services/supabaseClient.js";
import { generateAccessToken, generateRefreshToken } from "../utils/token.js";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
dotenv.config();

// Helper to get refresh token expiry
function getRefreshTokenExpiry() {
  const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || "7d";
  // Convert to timestamp
  const now = new Date();
  if (expiresIn.endsWith('d')) {
    now.setDate(now.getDate() + parseInt(expiresIn));
  } else if (expiresIn.endsWith('h')) {
    now.setHours(now.getHours() + parseInt(expiresIn));
  } else if (expiresIn.endsWith('m')) {
    now.setMinutes(now.getMinutes() + parseInt(expiresIn));
  } else {
    now.setDate(now.getDate() + 7); // default 7 days
  }
  return now.toISOString();
}

export async function signup(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const { email, password } = req.body;
  try {
    // Check if user exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();
    if (existingUser) {
      return res.status(409).json({ error: "Email already registered" });
    }
    const password_hash = await bcrypt.hash(password, 10);
    const { data: user, error } = await supabase
      .from("users")
      .insert([{ email, password_hash }])
      .select()
      .single();
    if (error) throw error;
    // Create profile
    await supabase.from("profiles").insert([{ user_id: user.id }]);
    // Tokens
    const accessToken = generateAccessToken({ id: user.id, email });
    const refreshToken = generateRefreshToken({ id: user.id, email });
    // Store refresh token in DB
    await supabase.from("refresh_tokens").insert([
      {
        user_id: user.id,
        token: refreshToken,
        expires_at: getRefreshTokenExpiry(),
      },
    ]);
    res
      .status(201)
      .json({ accessToken, refreshToken, user: { id: user.id, email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function login(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const { email, password } = req.body;
  try {
    const { data: user, error } = await supabase
      .from("users")
      .select("id, email, password_hash")
      .eq("email", email)
      .single();
    if (error || !user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    // ... after validating user
    const accessToken = generateAccessToken({ id: user.id, email });
    const refreshToken = generateRefreshToken({ id: user.id, email });
    // Store refresh token in DB
    await supabase.from("refresh_tokens").insert([
      {
        user_id: user.id,
        token: refreshToken,
        expires_at: getRefreshTokenExpiry(),
      },
    ]);
    res.json({ accessToken, refreshToken, user: { id: user.id, email } });

    // const token = jwt.sign({ id: user._id }, secret, { expiresIn: '1h' });
    // res.json({ token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function refreshToken(req, res) {
  const { refreshToken } = req.body;
  console.log(" log: ", refreshToken)
  if (!refreshToken) return res.status(401).json({ error: "No refresh token" });
  try {
    // Verify token signature
    console.log("verification");
    const secret = process.env.JWT_REFRESH_SECRET || 'default_secret';
    const payload = jwt.verify(refreshToken, secret);
    console.log("payload:", payload);
    // Check token exists in DB and not expired
    const { data: dbToken, error } = await supabase
      .from("refresh_tokens")
      .select("id, user_id, expires_at")
      .eq("token", refreshToken)
      .single();
    if (error || !dbToken) {
      return res.status(401).json({ error: "Refresh token not found or revoked" });
    }
    if (new Date(dbToken.expires_at) < new Date()) {
      // Expired, delete from DB
      await supabase.from("refresh_tokens").delete().eq("id", dbToken.id);
      return res.status(401).json({ error: "Refresh token expired" });
    }
    // Rotate: delete old, issue new
    await supabase.from("refresh_tokens").delete().eq("id", dbToken.id);
    const newAccessToken = generateAccessToken({ id: payload.id, email: payload.email });
    const newRefreshToken = generateRefreshToken({ id: payload.id, email: payload.email });
    await supabase.from("refresh_tokens").insert([
      {
        user_id: payload.id,
        token: newRefreshToken,
        expires_at: getRefreshTokenExpiry(),
      },
    ]);
    console.log(newAccessToken, newRefreshToken);
    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (err) {
    console.error("JWT verify error:", err);
    return res.status(401).json({ error: "Invalid refresh token" });
  }
}

export async function logout(req, res) {
  try {
    const { refreshToken, token: accessToken } = req.body;
    
    // If access token provided, extract user info and invalidate all their tokens
    if (accessToken) {
      try {
        const secret = process.env.JWT_ACCESS_SECRET || 'default_secret';
        const payload = jwt.verify(accessToken, secret);
        
        // Delete all refresh tokens for this user
        await supabase
          .from("refresh_tokens")
          .delete()
          .eq("user_id", payload.id);
          
        console.log(`Logged out user ${payload.id}, invalidated all tokens`);
      } catch (error) {
        console.warn("Invalid access token during logout:", error.message);
        // Continue with logout even if token is invalid
      }
    }
    
    // If refresh token provided, invalidate it specifically
    if (refreshToken) {
      await supabase
        .from("refresh_tokens")
        .delete()
        .eq("token", refreshToken);
    }
    
    res.json({ 
      success: true, 
      message: "Successfully logged out. All sessions have been terminated." 
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ 
      error: "Failed to complete logout", 
      details: error.message 
    });
  }
}

export async function googleOAuth(req, res) {
  // Placeholder for Google OAuth logic
  res.status(501).json({ error: "Google OAuth not implemented yet" });
}
