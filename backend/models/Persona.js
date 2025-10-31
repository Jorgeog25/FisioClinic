const mongoose = require("mongoose");

const PersonaSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    apellidos: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 160,
    },
    telefono: {
      type: String,
      trim: true,
      match: [/^[\d\s+\-()]{7,20}$/, "Teléfono inválido"],
    },
    notas: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    sesiones: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

PersonaSchema.index({ nombre: 1, apellidos: 1 });
PersonaSchema.index({ telefono: 1 }, { sparse: true });

module.exports = mongoose.model("Persona", PersonaSchema);
