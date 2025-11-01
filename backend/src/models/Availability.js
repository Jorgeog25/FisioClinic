const mongoose = require('mongoose');

// Each doc represents a working day with a start/end time and slot size.
const AvailabilitySchema = new mongoose.Schema({
  date: { type: String, required: true }, // 'YYYY-MM-DD' in clinic timezone
  startTime: { type: String, required: true }, // 'HH:mm'
  endTime: { type: String, required: true },   // 'HH:mm'
  slotMinutes: { type: Number, default: 60 },  // 60 by default
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

AvailabilitySchema.index({ date: 1 }, { unique: true });

module.exports = mongoose.model('Availability', AvailabilitySchema);
