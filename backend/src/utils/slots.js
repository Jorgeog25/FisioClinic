function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}
function toHHMM(m) {
  const h = Math.floor(m / 60).toString().padStart(2, '0');
  const mm = (m % 60).toString().padStart(2, '0');
  return `${h}:${mm}`;
}
function generateSlots(startTime, endTime, slotMinutes = 60) {
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  const slots = [];
  for (let t = start; t + slotMinutes <= end; t += slotMinutes) {
    slots.push(toHHMM(t));
  }
  return slots;
}
module.exports = { generateSlots };
