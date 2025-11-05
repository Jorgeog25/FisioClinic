// backend/src/models/Availability.js
const mongoose = require("mongoose");

const AvailabilitySchema = new mongoose.Schema(
  {
    date: { type: String, required: true, unique: true }, // 'YYYY-MM-DD'
    startTime: { type: String, required: true }, // 'HH:mm'
    endTime: { type: String, required: true }, // 'HH:mm'
    slotMinutes: { type: Number, default: 60, min: 5, max: 240 },
    isActive: { type: Boolean, default: true },
    blockedSlots: { type: [String], default: [] }, // 'HH:mm'
  },
  { timestamps: true }
);

module.exports = mongoose.model("Availability", AvailabilitySchema);
