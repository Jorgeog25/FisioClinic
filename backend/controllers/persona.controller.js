const mongoose = require("mongoose");
const Persona = require("../models/Persona");

// Helper: validar ObjectId
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

exports.listar = async (req, res, next) => {
  try {
    const {
      q,              // búsqueda de texto
      page = 1,       // página
      limit = 10,     // tamaño de página
      sort = "-createdAt", // orden
    } = req.query;

    const filtro = {};
    if (q && q.trim() !== "") {
      // Búsqueda flexible: texto + regex sobre nombre
      filtro.$or = [
        { $text: { $search: q } },
        { nombre: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { dni: { $regex: q, $options: "i" } },
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
  } catch (err) {
    next(err);
  }
};

exports.obtener = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      const e = new Error("ID no válido");
      e.status = 400;
      throw e;
    }
    const persona = await Persona.findById(id);
    if (!persona) {
      const e = new Error("Persona no encontrada");
      e.status = 404;
      throw e;
    }
    res.json(persona);
  } catch (err) {
    next(err);
  }
};

exports.crear = async (req, res, next) => {
  try {
    const persona = new Persona(req.body);
    const creada = await persona.save();
    res.status(201).json(creada);
  } catch (err) {
    // Validaciones de Mongoose
    if (err.name === "ValidationError") {
      err.status = 400;
    }
    next(err);
  }
};

exports.actualizar = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      const e = new Error("ID no válido");
      e.status = 400;
      throw e;
    }
    const actualizada = await Persona.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!actualizada) {
      const e = new Error("Persona no encontrada");
      e.status = 404;
      throw e;
    }
    res.json(actualizada);
  } catch (err) {
    if (err.name === "ValidationError") {
      err.status = 400;
    }
    next(err);
  }
};

exports.eliminar = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      const e = new Error("ID no válido");
      e.status = 400;
      throw e;
    }
    const eliminada = await Persona.findByIdAndDelete(id);
    if (!eliminada) {
      const e = new Error("Persona no encontrada");
      e.status = 404;
      throw e;
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};
