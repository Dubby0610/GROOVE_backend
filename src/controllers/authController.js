import { validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import supabase from '../services/supabaseClient.js';
import {
  generateAccessToken,
  generateRefreshToken,
} from '../utils/token.js';
import dotenv from 'dotenv';
dotenv.config();

export async function signup(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const { email, password } = req.body;
  try {
    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    const password_hash = await bcrypt.hash(password, 10);
    const { data: user, error } = await supabase
      .from('users')
      .insert([{ email, password_hash }])
      .select()
      .single();
    if (error) throw error;
    // Create profile
    await supabase.from('profiles').insert([{ user_id: user.id }]);
    // Tokens
    const secret = process.env.JWT_SECRET || 'default_secret';
    if (!secret) return res.status(500).json({ error: "Missing JWT_SECRET" });
    const accessToken = generateAccessToken({ id: user.id, secret, email });
    const refreshToken = generateRefreshToken({ id: user.id, secret, email });
    res.status(201).json({ accessToken, refreshToken, user: { id: user.id, email } });
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
      .from('users')
      .select('id, email, password_hash')
      .eq('email', email)
      .single();
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
      // ... after validating user
    const secret = process.env.JWT_SECRET || 'default_secret';
    if (!secret) return res.status(500).json({ error: "Missing JWT_SECRET" });

    const accessToken = generateAccessToken({ id: user.id, secret, email });
    const refreshToken = generateRefreshToken({ id: user.id, secret, email });
    res.json({ accessToken, refreshToken, user: { id: user.id, email } });

    // const token = jwt.sign({ id: user._id }, secret, { expiresIn: '1h' });
    // res.json({ token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function refreshToken(req, res) {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'No refresh token' });
  try {
    const payload = require('../utils/token.js').verifyRefreshToken(refreshToken);
    const accessToken = generateAccessToken({ id: payload.id, email: payload.email });
    res.json({ accessToken });
  } catch (err) {
    res.status(403).json({ error: 'Invalid or expired refresh token' });
  }
}

export async function googleOAuth(req, res) {
  // Placeholder for Google OAuth logic
  res.status(501).json({ error: 'Google OAuth not implemented yet' });
} 