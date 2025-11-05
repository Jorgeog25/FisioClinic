const Appointment = require('../models/Appointment');
const Availability = require('../models/Availability');

// POST /api/appointments  (cliente crea su cita)
exports.create = async (req, res, next) => {
  try {
    const { date, time } = req.body;
    const clientId = req.user?.clientId;

    if (!clientId) {
      return res.status(400).json({ error: 'No se ha encontrado el cliente asociado al usuario.' });
    }
    if (!date || !time) {
      return res.status(400).json({ error: 'Faltan campos: date y time son obligatorios.' });
    }

    // (Opcional) Bloqueo de días pasados en servidor
    const today = new Date();
    today.setHours(0,0,0,0);
    const [y,m,d] = date.split('-').map(Number);
    const picked = new Date(y, m-1, d);
    if (picked < today) {
      return res.status(400).json({ error: 'No se puede reservar en días pasados.' });
    }

    // Validar que el día está activo y la hora cae dentro del rango
    const day = await Availability.findOne({ date });
    if (!day || !day.isActive) {
      return res.status(400).json({ error: 'Ese día no está disponible.' });
    }
    // Comprueba que la hora está dentro del rango del día
    const within =
      time >= day.startTime &&
      time <  day.endTime;
    if (!within) {
      return res.status(400).json({ error: 'Hora fuera del horario disponible.' });
    }

    // Evitar doble reserva en esa franja para ese día
    const exists = await Appointment.findOne({ date, time });
    if (exists) {
      return res.status(409).json({ error: 'Esa hora ya está reservada.' });
    }

    const appt = await Appointment.create({
      date,
      time,
      clientId,          // 👈 CLAVE: asociar el cliente
      status: 'booked'
    });

    res.status(201).json(appt);
  } catch (e) { next(e); }
};

// GET /api/appointments?date=YYYY-MM-DD  (admin ve citas del día)
exports.listByDate = async (req, res, next) => {
  try {
    const { date } = req.query;
    const filter = date ? { date } : {};
    const appts = await Appointment.find(filter)
      .populate({ path: 'clientId', select: 'firstName lastName reason' })
      .sort({ date: 1, time: 1 });
    res.json(appts);
  } catch (e) { next(e); }
};

// GET /api/appointments/me  (cliente ve su historial)
exports.my = async (req, res, next) => {
  try {
    const clientId = req.user.clientId;
    const appts = await Appointment.find({ clientId })
      .populate({ path: 'clientId', select: 'firstName lastName reason' })
      .sort({ date: -1, time: -1 });
    res.json(appts);
  } catch (e) { next(e); }
};
