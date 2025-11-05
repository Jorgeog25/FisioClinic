const Availability = require('../models/Availability');
const Appointment  = require('../models/Appointment');

function toMin(hm){ const [h,m]=hm.split(':').map(Number); return h*60+m }
function toHM(min){ const h=Math.floor(min/60), m=min%60; return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}` }

exports.listSlots = async (req, res, next) => {
  try {
    const { date } = req.params;
    const day = await Availability.findOne({ date }).lean();
    if (!day || !day.isActive) return res.json([]);

    const booked = await Appointment.find({ date }).lean();
    const reservedSet = new Set(booked.map(b => b.time));
    const blockedSet  = new Set(day.blockedSlots || []);

    const S = toMin(day.startTime), E = toMin(day.endTime);
    const step = day.slotMinutes || 60;

    const out = [];
    for (let t = S; t + step <= E; t += step) {
      const time = toHM(t);
      if (reservedSet.has(time)) continue;
      if (blockedSet.has(time))  continue;
      out.push(time);
    }
    res.json(out);
  } catch (e) { next(e); }
};
