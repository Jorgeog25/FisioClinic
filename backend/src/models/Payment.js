const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true },
  amount: { type: Number, required: true },
  method: { type: String, enum: ['efectivo', 'tarjeta', 'transferencia', 'otro'], required: true },
  status: { type: String, enum: ['pagado', 'pendiente'], default: 'pagado' }
}, { timestamps: true });

PaymentSchema.index({ appointmentId: 1 }, { unique: true });

module.exports = mongoose.model('Payment', PaymentSchema);
