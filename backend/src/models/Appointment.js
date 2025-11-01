const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  date: { type: String, required: true },      // 'YYYY-MM-DD'
  time: { type: String, required: true },      // 'HH:mm' start time
  durationMinutes: { type: Number, default: 60 },
  status: { type: String, enum: ['booked', 'completed', 'cancelled'], default: 'booked' },
  notes: { type: String }
}, { timestamps: true });

AppointmentSchema.index({ date: 1, time: 1 }, { unique: true });

module.exports = mongoose.model('Appointment', AppointmentSchema);
