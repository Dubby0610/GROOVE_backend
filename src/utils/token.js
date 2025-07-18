import jwt from 'jsonwebtoken';

export function generateAccessToken(payload) {
  // Only allow id and email in payload
  const { id, email } = payload;
  return jwt.sign({ id, email }, process.env.JWT_ACCESS_SECRET || 'default_secret', {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '20s',
  });
}

export function generateRefreshToken(payload) {
  // Only allow id and email in payload
  const { id, email } = payload;
  return jwt.sign({ id, email }, process.env.JWT_REFRESH_SECRET || 'default_secret', {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'default_secret');
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'default_secret');
} 