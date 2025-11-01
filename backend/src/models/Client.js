const mongoose = require('mongoose');

const ClientSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  phone: { type: String, required: true },
  reason: { type: String }, // Por qué viene
  notes: { type: String }   // Notas clínicas opcionales
}, { timestamps: true });

ClientSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`.trim();
});

module.exports = mongoose.model('Client', ClientSchema);
