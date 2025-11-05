const Availability = require('../models/Availability');
const Appointment  = require('../models/Appointment');

// --- Helpers seguros ---
function pad2(n){ return String(n).padStart(2, '0') }
function ymd(d){ return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}` }

/**
 * Devuelve SIEMPRE { from, to } en formato 'YYYY-MM-DD'
 * Casos soportados:
 *  - sin params: mes actual completo
 *  - solo from: to = from
 *  - solo to:   from = to
 *  - from>to:   intercambia
 */
function normalizeRange(qFrom, qTo) {
  let from = (typeof qFrom === 'string' && qFrom.trim()) ? qFrom.trim() : null;
  let to   = (typeof qTo   === 'string' && qTo.trim())   ? qTo.trim()   : null;

  if (!from && !to) {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const last  = new Date(now.getFullYear(), now.getMonth()+1, 0);
    from = ymd(first);
    to   = ymd(last);
  } else if (from && !to) {
    to = from;
  } else if (!from && to) {
    from = to;
  }

  if (from > to) {
    const tmp = from; from = to; to = tmp;
  }
  return { from, to };
}

// GET /api/availability?from=YYYY-MM-DD&to=YYYY-MM-DD
exports.listInRange = async (req, res, next) => {
  try {
    // ⚠️ NUNCA desestructures de algo potencialmente undefined
    const { from, to } = normalizeRange(
      req?.query?.from,
      req?.query?.to
    );

    const rows = await Availability
      .find({ date: { $gte: from, $lte: to } })
      .sort({ date: 1 })
      .lean();

    // devolver SIEMPRE array
    res.json(Array.isArray(rows) ? rows : []);
  } catch (e) { next(e); }
};

// POST /api/availability  (upsert rango + slots bloqueados)
exports.upsert = async (req, res, next) => {
  try {
    const { date, startTime, endTime, slotMinutes, isActive, blockedSlots = [] } = req.body;

    if (!date || !startTime || !endTime) {
      return res.status(400).json({ error: 'Faltan campos: date, startTime y endTime' });
    }
    if (endTime <= startTime) {
      return res.status(400).json({ error: 'El fin debe ser mayor que el inicio' });
    }

    const hasAppts = await Appointment.countDocuments({ date });

    // No cerrar si hay citas
    if (hasAppts > 0 && isActive === false) {
      return res.status(409).json({ error: `No puedes cerrar ${date}. Hay ${hasAppts} cita(s).` });
    }

    // No dejar citas fuera del rango
    if (hasAppts > 0) {
      const conflict = await Appointment.findOne({
        date,
        $or: [{ time: { $lt: startTime } }, { time: { $gte: endTime } }]
      });
      if (conflict) {
        return res.status(409).json({ error: `No puedes ajustar el horario: existen citas fuera de ${startTime}–${endTime}.` });
      }
    }

    // No bloquear horas con cita
    if (blockedSlots?.length) {
      const clash = await Appointment.findOne({ date, time: { $in: blockedSlots } });
      if (clash) return res.status(409).json({ error: `No puedes bloquear ${clash.time}: ya tiene una cita.` });
    }

    const doc = await Availability.findOneAndUpdate(
      { date },
      { $set: { date, startTime, endTime, slotMinutes, isActive, blockedSlots } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json(doc);
  } catch (e) { next(e); }
};
