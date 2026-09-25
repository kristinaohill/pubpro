const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'pubplanning_secret_key_change_in_prod';

function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' });
}

function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    req.user = verifyToken(auth.slice(7));
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }
    next();
  });
}

/** Keeps external-author logins out of staff-only endpoints. */
function blockAuthors(req, res, next) {
  if (req.user && req.user.role === 'author') return res.status(403).json({ error: 'Not available to external authors' });
  next();
}

module.exports = { signToken, verifyToken, requireAuth, requireAdmin, blockAuthors };
