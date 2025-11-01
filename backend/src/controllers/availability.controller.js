const Availability = require('../models/Availability');
const Appointment = require('../models/Appointment');
const { generateSlots } = require('../utils/slots');

exports.setDay = async (req, res, next) => {
  try {
    const { date, startTime, endTime, slotMinutes = 60, isActive = true } = req.body;
    const doc = await Availability.findOneAndUpdate(
      { date },
      { date, startTime, endTime, slotMinutes, isActive },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json(doc);
  } catch (e) { next(e); }
};

exports.getCalendar = async (req, res, next) => {
  try {
    const { from, to } = req.query; // optional range
    const query = {};
    if (from && to) query.date = { $gte: from, $lte: to };
    const days = await Availability.find(query).sort({ date: 1 });
    res.json(days);
  } catch (e) { next(e); }
};

exports.getDaySlots = async (req, res, next) => {
  try {
    const { date } = req.params;
    const day = await Availability.findOne({ date, isActive: true });
    if (!day) return res.json({ date, slots: [], active: false });
    const allSlots = generateSlots(day.startTime, day.endTime, day.slotMinutes);
    const booked = await Appointment.find({ date }).distinct('time');
    const free = allSlots.filter(t => !booked.includes(t));
    res.json({ date, active: true, slots: free, slotMinutes: day.slotMinutes });
  } catch (e) { next(e); }
};
