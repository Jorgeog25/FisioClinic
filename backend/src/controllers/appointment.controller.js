const Appointment = require("../models/Appointment");
const Client = require("../models/Client");

// Helpers de forma y tiempo
function toHHMM(s) {
  if (!s) return s;
  if (typeof s === "number") {
    const h = Math.floor(s / 60),
      m = s % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  if (/^\d{2}:\d{2}:\d{2}$/.test(s)) return s.slice(0, 5);
  if (/^\d{2}:\d{2}$/.test(s)) return s;
  // ISO -> hh:mm
  const d = new Date(s);
  if (!isNaN(+d)) {
    const h = d.getHours(),
      m = d.getMinutes();
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  return s;
}

function normalizeClientShape(c) {
  if (!c) return null;
  // c puede venir populado o id
  if (typeof c === "object") {
    return {
      _id: c._id,
      firstName: c.firstName || "",
      lastName: c.lastName || "",
      reason: c.reason || "",
    };
  }
  // solo id
  return c;
}

function normalizeAppointment(a) {
  return {
    _id: a._id,
    date: a.date, // YYYY-MM-DD
    time: toHHMM(a.time), // HH:mm
    status: a.status || "reserved",
    clientId: normalizeClientShape(a.clientId),
  };
}

// GET /api/appointments?date=YYYY-MM-DD
exports.listByDate = async (req, res, next) => {
  try {
    const { date } = req.query;
    if (!date) return res.json([]); // UI lo maneja

    const rows = await Appointment.find({ date })
      .sort({ time: 1 })
      .populate("clientId", "firstName lastName reason")
      .lean();

    res.json(rows.map(normalizeAppointment));
  } catch (e) {
    next(e);
  }
};

// GET /api/appointments/summary?from=YYYY-MM-DD&to=YYYY-MM-DD&populate=1
exports.summary = async (req, res, next) => {
  try {
    const { from, to, populate } = req.query;
    const q = {};
    if (from) q.date = { ...(q.date || {}), $gte: from };
    if (to) q.date = { ...(q.date || {}), $lte: to };

    let cur = Appointment.find(q).sort({ date: 1, time: 1 });
    if (String(populate) === "1") {
      cur = cur.populate("clientId", "firstName lastName reason");
    }
    const rows = await cur.lean();

    res.json(rows.map(normalizeAppointment));
  } catch (e) {
    next(e);
  }
};

// POST /api/appointments
// body: { date:"YYYY-MM-DD", time:"HH:mm", clientId, status? }
exports.create = async (req, res, next) => {
  try {
    const { date, time, clientId, status } = req.body;
    if (!date || !time || !clientId) {
      return res
        .status(400)
        .json({ error: "date, time y clientId son obligatorios" });
    }

    // Evitar duplicado misma hora
    const clash = await Appointment.findOne({ date, time, clientId });
    if (clash)
      return res
        .status(409)
        .json({ error: "Ya existe una cita para ese cliente a esa hora" });

    const appt = await Appointment.create({
      date,
      time: toHHMM(time),
      clientId,
      status: status || "reserved",
    });
    const saved = await Appointment.findById(appt._id)
      .populate("clientId", "firstName lastName reason")
      .lean();
    res.status(201).json(normalizeAppointment(saved));
  } catch (e) {
    next(e);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const patch = {};
    if (typeof req.body.status === 'string') patch.status = req.body.status;

    const upd = await Appointment.findByIdAndUpdate(id, { $set: patch }, { new: true })
      .populate('clientId','firstName lastName reason')
      .lean();

    if (!upd) return res.status(404).json({ error: 'Cita no encontrada' });

    res.json({
      _id: upd._id,
      date: upd.date,
      time: (upd.time||'').slice(0,5),
      status: upd.status,
      clientId: upd.clientId ? {
        _id: upd.clientId._id,
        firstName: upd.clientId.firstName || '',
        lastName:  upd.clientId.lastName  || '',
        reason:    upd.clientId.reason    || '',
      } : null
    });
  } catch (e) { next(e); }
};
