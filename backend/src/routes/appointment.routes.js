const router = require("express").Router();
const { auth, requireRole } = require("../middleware/auth");
const ctrl = require("../controllers/appointment.controller");

// Listado por día (cliente/admin)
router.get("/", auth(true), ctrl.listByDate);

// Resumen entre fechas (solo admin)
router.get("/summary", auth(true), requireRole("admin"), ctrl.summary);

// Crear cita (cliente/admin)
router.post("/", auth(true), ctrl.create);

module.exports = router;
