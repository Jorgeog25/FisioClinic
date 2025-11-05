// backend/src/middleware/auth.js
const jwt = require('jsonwebtoken');

exports.auth = (required = false) => (req, res, next) => {
  const hdr = req.headers.authorization || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;

  if (!token) {
    if (required) return res.status(401).json({ error: 'No autenticado' });
    req.user = null; return next();
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // payload debe tener: id, role, email, clientId (así los firmamos en auth.controller)
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

exports.requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'No autorizado' });
  }
  next();
};
