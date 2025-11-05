const jwt = require('jsonwebtoken');

/**
 * Middleware universal de auth:
 * - Uso 1: router.get('/x', auth, handler)
 * - Uso 2: router.get('/x', auth(), handler)
 * - Uso 3: router.get('/x', auth({ optional:true }), handler)
 */
function makeAuthMiddleware(opts = {}) {
  const optional = !!opts.optional;

  return function authMiddleware(req, res, next) {
    try {
      const hdr = (req && req.headers && req.headers.authorization) || '';
      const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;

      if (!token) {
        if (optional) return next();
        return res.status(401).json({ error: 'No autorizado' });
      }

      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.user = payload;
      next();
    } catch (e) {
      if (optional) return next();
      return res.status(401).json({ error: 'Token inválido' });
    }
  };
}

// Export “inteligente”: soporta auth, auth(), auth(opts)
function auth(arg1, arg2, arg3) {
  // Si parece un middleware (req,res,next), actúa como middleware con opts por defecto
  if (arg1 && arg1.headers && typeof arg2 === 'object' && typeof arg3 === 'function') {
    return makeAuthMiddleware()(arg1, arg2, arg3);
  }
  // Si se llamó como fábrica: auth() o auth(opts)
  if (arg1 === undefined) return makeAuthMiddleware();
  if (typeof arg1 === 'object') return makeAuthMiddleware(arg1);

  // Cualquier otro caso, devuelve middleware por defecto
  return makeAuthMiddleware();
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: 'Prohibido' });
    }
    next();
  };
}

module.exports = { auth, requireRole };
