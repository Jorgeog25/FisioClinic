const Appointment = require('../models/Appointment');
const Availability = require('../models/Availability');

exports.book = async (req, res, next) => {
  try {
    const { clientId, date, time } = req.body;
    const day = await Availability.findOne({ date, isActive: true });
    if (!day) return res.status(400).json({ error: 'Día no activo' });

    // Avoid double booking
    const exists = await Appointment.findOne({ date, time });
    if (exists) return res.status(409).json({ error: 'Hora ya reservada' });

    const appt = await Appointment.create({ clientId, date, time, durationMinutes: day.slotMinutes });
    res.status(201).json(appt);
  } catch (e) { 
    if (e.code === 11000) return res.status(409).json({ error: 'Ranura ya ocupada' });
    next(e); 
  }
};

exports.listByDate = async (req, res, next) => {
  try {
    const { date } = req.query;
    const filter = date ? { date } : {};
    const appts = await Appointment.find(filter).sort({ date: 1, time: 1 });
    res.json(appts);
  } catch (e) { next(e); }
};

exports.my = async (req, res, next) => {
  try {
    const clientId = req.user.clientId;
    const appts = await Appointment.find({ clientId }).sort({ date: -1, time: -1 });
    res.json(appts);
  } catch (e) { next(e); }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const appt = await Appointment.findByIdAndUpdate(req.params.id, { status, notes }, { new: true });
    if (!appt) return res.status(404).json({ error: 'Cita no encontrada' });
    res.json(appt);
  } catch (e) { next(e); }
};
