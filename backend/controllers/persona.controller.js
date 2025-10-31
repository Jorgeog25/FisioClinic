const mongoose = require("mongoose");
const Persona = require("../models/Persona");

// Helper: validar ObjectId
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Limitar a los campos permitidos
const pickPersona = (body) => {
  const { nombre, apellidos, telefono, notas, sesiones } = body;
  const doc = { nombre, apellidos };
  if (telefono !== undefined) doc.telefono = telefono;
  if (notas !== undefined) doc.notas = notas;
  if (sesiones !== undefined) doc.sesiones = sesiones;
  return doc;
};

// ====== LISTAR ======
exports.listar = async (req, res, next) => {
  try {
    const { q, page = 1, limit = 10, sort = "-createdAt" } = req.query;

    const filtro = {};
    if (q && q.trim() !== "") {
      filtro.$or = [
        { nombre:   { $regex: q, $options: "i" } },
        { apellidos:{ $regex: q, $options: "i" } },
        { telefono: { $regex: q, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [total, data] = await Promise.all([
      Persona.countDocuments(filtro),
      Persona.find(filtro).sort(sort).skip(skip).limit(Number(limit))
    ]);

    res.json({
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      limit: Number(limit),
      data,
    });
  } catch (err) { next(err); }
};

// ====== OBTENER ======
exports.obtener = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      const e = new Error("ID no válido"); e.status = 400; throw e;
    }
    const persona = await Persona.findById(id);
    if (!persona) {
      const e = new Error("Persona no encontrada"); e.status = 404; throw e;
    }
    res.json(persona);
  } catch (err) { next(err); }
};

// ====== CREAR ======
exports.crear = async (req, res, next) => {
  try {
    const persona = new Persona(pickPersona(req.body));
    const creada = await persona.save();
    res.status(201).json(creada);
  } catch (err) {
    if (err.name === "ValidationError") err.status = 400;
    next(err);
  }
};

// ====== ACTUALIZAR ======
exports.actualizar = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      const e = new Error("ID no válido"); e.status = 400; throw e;
    }
    const actualizada = await Persona.findByIdAndUpdate(
      id,
      pickPersona(req.body),
      { new: true, runValidators: true }
    );
    if (!actualizada) {
      const e = new Error("Persona no encontrada"); e.status = 404; throw e;
    }
    res.json(actualizada);
  } catch (err) {
    if (err.name === "ValidationError") err.status = 400;
    next(err);
  }
};

// ====== ELIMINAR ======
exports.eliminar = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      const e = new Error("ID no válido"); e.status = 400; throw e;
    }
    const eliminada = await Persona.findByIdAndDelete(id);
    if (!eliminada) {
      const e = new Error("Persona no encontrada"); e.status = 404; throw e;
    }
    res.json({ ok: true });
  } catch (err) { next(err); }
};
