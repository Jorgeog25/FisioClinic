const Client = require('../models/Client');
const Appointment = require('../models/Appointment');
const Payment = require('../models/Payment');
const User = require("../models/User");


exports.create = async (req, res, next) => {
  try {
    const client = await Client.create(req.body);
    res.status(201).json(client);
  } catch (e) { next(e); }
};

exports.list = async (req, res, next) => {
  try {
    const clients = await Client.find()
      .sort({ createdAt: -1 })
      .lean();

    const users = await User.find({
      clientId: { $in: clients.map(c => c._id) }
    })
      .select("email role clientId")
      .lean();

    const result = clients.map(client => ({
      ...client,
      user:
        users.find(
          u => String(u.clientId) === String(client._id)
        ) || null
    }));

    res.json(result);
  } catch (e) {
    next(e);
  }
};


exports.get = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ error: 'Cliente no encontrado' });
    const appts = await Appointment.find({ clientId: client._id }).sort({ date: -1, time: -1 });
    const payments = await Payment.find({ clientId: client._id }).sort({ createdAt: -1 });
    res.json({ client, history: appts, payments });
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    const client = await Client.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!client) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(client);
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try {
    const id = req.params.id;

    // Borrado en cascada (opcional pero recomendado)
    await Appointment.deleteMany({ clientId: id });
    await Payment.deleteMany({ clientId: id });

    const deleted = await Client.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: 'Cliente no encontrado' });

    res.json({ ok: true });
  } catch (e) { next(e); }
};

exports.updateUserRole = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({ error: "Rol no válido" });
    }

    // Evitar que el admin se quite su propio rol
    if (String(req.user.id) === String(userId)) {
      return res.status(400).json({ error: "No puedes cambiar tu propio rol" });
    }

    const updated = await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true }
    ).select("email role");

    if (!updated) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json(updated);
  } catch (e) {
    next(e);
  }
};
