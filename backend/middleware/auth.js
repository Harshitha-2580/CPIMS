const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production';
const JWT_EXPIRES_IN = '2h';

const PUBLIC_ROUTES = [
  { method: 'POST', path: '/login' },
  { method: 'POST', path: '/verify-otp' },
  { method: 'POST', path: '/resend-otp' },
  { method: 'POST', path: '/forgot-password' },
  { method: 'POST', path: '/reset-password' },
  { method: 'POST', path: '/admin/reset-password' },
  { method: 'POST', path: '/student/signup' },
  { method: 'POST', path: '/faculty/login-email' },
  { method: 'POST', path: '/faculty/verify-otp' }
];

function createToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function getCookieValue(cookieHeader, name) {
  if (!cookieHeader) return null;
  const cookieParts = cookieHeader.split(';');
  for (const part of cookieParts) {
    const [rawKey, ...rawValueParts] = part.trim().split('=');
    if (rawKey === name) {
      const rawValue = rawValueParts.join('=');
      try {
        return decodeURIComponent(rawValue);
      } catch {
        return rawValue;
      }
    }
  }
  return null;
}

function authMiddleware(req, res, next) {
  const normalizedPath = req.path.replace(/\/+$/, '');
  const isPublic = PUBLIC_ROUTES.some(
    route => route.method === req.method && route.path === normalizedPath
  );

  if (isPublic) {
    return next();
  }

  const authHeader = req.headers.authorization || req.headers.Authorization;
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    token = getCookieValue(req.headers.cookie, 'auth_token');
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authorization token missing' });
  }

  try {
    req.user = verifyToken(token);
    return next();
  } catch (err) {
    console.error('Auth token validation failed:', err.message || err);
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

module.exports = {
  createToken,
  verifyToken,
  authMiddleware
};
