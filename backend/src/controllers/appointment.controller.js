// *** IMPORTA UNA SOLA VEZ ***
// Con tu estructura real, el modelo está en ../models/Appointment
const Appointment = require("../models/Appointment");

// Normalizador para respuestas
function normalize(a) {
  if (!a) return a;
  return {
    _id: a._id,
    date: a.date,
    time: (a.time || "").slice(0, 5),
    status: a.status || "reserved",
    clientId: a.clientId || null,
  };
}

// GET /appointments?date=YYYY-MM-DD   (si no hay date => todas)
exports.list = async (req, res, next) => {
  try {
    const { date } = req.query;
    const q = {};
    if (date) q.date = date;

    const rows = await Appointment.find(q)
      .sort({ date: 1, time: 1 })
      .populate("clientId", "firstName lastName reason")
      .lean();

    res.json(rows.map(normalize));
  } catch (e) {
    next(e);
  }
};

// (Si la tienes montada en rutas) GET /appointments/me
exports.myHistory = async (req, res, next) => {
  try {
    const clientId = req.user?.clientId;
    if (!clientId) return res.status(403).json({ error: "Solo clientes autenticados" });

    const rows = await Appointment.find({ clientId })
      .sort({ date: 1, time: 1 })
      .populate("clientId", "firstName lastName reason")
      .lean();

    res.json(rows.map(normalize));
  } catch (e) {
    next(e);
  }
};

// POST /appointments
exports.create = async (req, res, next) => {
  try {
    let { date, time, clientId } = req.body;

    // Toma clientId del token si no viene en body
    if (!clientId && req.user?.clientId) clientId = req.user.clientId;

    if (!date || !time || !clientId) {
      return res.status(400).json({ error: "date, time y clientId son obligatorios" });
    }

    // Permite reservar si la anterior estaba cancelada
    const clash = await Appointment.findOne({ date, time, status: { $ne: "cancelled" } });
    if (clash) {
      return res.status(409).json({ error: "Esa hora ya está reservada." });
    }

    const created = await Appointment.create({ date, time, clientId, status: "reserved" });
    const saved = await Appointment.findById(created._id)
      .populate("clientId", "firstName lastName reason")
      .lean();

    res.status(201).json(normalize(saved));
  } catch (e) {
    next(e);
  }
};

// PATCH /appointments/:id   (status, etc.)
exports.update = async (req, res, next) => {
  try {
    const id = req.params.id;
    const patch = {};

    if (typeof req.body.status === "string") patch.status = req.body.status;
    // añade aquí otros campos permitidos si un día los necesitas

    const updated = await Appointment.findByIdAndUpdate(id, patch, { new: true })
      .populate("clientId", "firstName lastName reason")
      .lean();

    if (!updated) return res.status(404).json({ error: "Cita no encontrada" });
    res.json(normalize(updated));
  } catch (e) {
    next(e);
  }
};
