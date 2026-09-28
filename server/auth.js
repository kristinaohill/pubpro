const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'pubplanning_secret_key_change_in_prod';

function signToken(payload, expiresIn = '7d') {
  return jwt.sign(payload, SECRET, { expiresIn });
}

function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

// Role, name and active flag come from the database on every request, so a role change or a
// deactivation on the System Administrator page applies at once, not when the token expires.
function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  let claims;
  try {
    claims = verifyToken(auth.slice(7));
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
  const db = require('./db');
  const { permissionsForUser, rolesOf } = require('./permissions');
  const row = db.prepare('SELECT id, email, name, role, extra_roles, role_scopes, client_id, author_profile_id, active, pending FROM users WHERE id = ?').get(claims.id);
  if (!row) return res.status(401).json({ error: 'Your account no longer exists. Sign in again.' });
  if (!row.active) return res.status(401).json({ error: 'Your account has been deactivated. Contact your system administrator.' });
  if (row.pending) return res.status(401).json({ error: 'Your account is waiting for an administrator to approve it.' });
  req.user = { ...claims, email: row.email, name: row.name, role: row.role, roles: rolesOf(row), client_id: row.client_id, author_profile_id: row.author_profile_id || null };
  // Set when a System Administrator is signed in as this user (System Administrator > Sign In As).
  req.impersonator = claims.imp || null;
  req.perms = permissionsForUser(row);
  // Roles can be limited to some products: permsFor(product) counts only the roles covering it.
  req.permsFor = product => permissionsForUser(row, product || null);
  next();
}

/** can(req, perm) = anywhere; can(req, perm, product) = for a record of that product (null = no product yet). */
const can = (req, perm, product) => {
  if (product !== undefined && req.permsFor) return req.permsFor(product).includes(perm);
  return !!(req.perms && req.perms.includes(perm));
};

/** Staff permission check (see permissions.js). Answers 403 with the reason when it's missing. */
function requirePerm(perm) {
  return (req, res, next) => {
    if (can(req, perm)) return next();
    const { PERMISSIONS } = require('./permissions');
    const p = PERMISSIONS.find(x => x.key === perm);
    res.status(403).json({ error: 'Your role does not allow this' + (p ? ' (' + p.label.toLowerCase() + ')' : '') + '.' });
  };
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (!(req.user.roles || [req.user.role]).includes('admin')) {
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

module.exports = { signToken, verifyToken, requireAuth, requireAdmin, requirePerm, can, blockAuthors };
