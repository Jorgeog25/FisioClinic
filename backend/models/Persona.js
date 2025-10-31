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
    edad: {
      type: Number,
      min: 0,
      max: 130,
      required: true,
    },
    telefono: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Email inválido"],
    },
    direccion: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    notas: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    // Campos útiles para clínica
    dni: {
      type: String,
      trim: true,
      unique: false, // ponlo a true si quieres que no se repita
    },
    fechaAlta: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// Índice de texto para búsquedas por nombre/email/dni
PersonaSchema.index({ nombre: "text", email: "text", dni: "text" });

module.exports = mongoose.model("Persona", PersonaSchema);
