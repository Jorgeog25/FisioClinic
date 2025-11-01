const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Client = require('../models/Client');

function sign(user) {
  return jwt.sign(
    { id: user._id, role: user.role, email: user.email, clientId: user.clientId || null },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// ===== Registro público de CLIENTE =====
exports.registerClient = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password, firstName, lastName, phone, reason } = req.body;

    const client = await Client.create({ firstName, lastName, phone, reason });
    const user = await User.create({ email, password, role: 'client', clientId: client._id });

    return res.status(201).json({
      token: sign(user),
      user: { id: user._id, role: user.role, email: user.email, clientId: user.clientId }
    });
  } catch (e) { next(e); }
};

// ===== Registro ADMIN (crear admin o cliente) =====
exports.registerAny = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password, role, firstName, lastName, phone, reason } = req.body;

    let clientId = null;
    if (role === 'client') {
      const client = await Client.create({ firstName, lastName, phone, reason });
      clientId = client._id;
    }

    const user = await User.create({ email, password, role, clientId });
    return res.status(201).json({
      token: sign(user),
      user: { id: user._id, role: user.role, email: user.email, clientId }
    });
  } catch (e) { next(e); }
};

// ===== Login =====
exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });

    return res.json({
      token: sign(user),
      user: { id: user._id, role: user.role, email: user.email, clientId: user.clientId }
    });
  } catch (e) { next(e); }
};

// ===== Perfil =====
exports.me = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    return res.json({ user });
  } catch (e) { next(e); }
};
