const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/appointment.controller");

// --- resolver middleware de auth sin romper sea cual sea su forma de export ---
function resolveAuth() {
  const mod = require("../middleware/auth"); // <-- tu ruta real
  // 1) export directo como función (middleware)
  if (typeof mod === "function") return mod;

  // 2) export como objeto con named exports
  if (mod && typeof mod === "object") {
    if (typeof mod.auth === "function") return mod.auth;
    if (typeof mod.requireAuth === "function") return mod.requireAuth;
    if (typeof mod.default === "function") return mod.default;
  }

  throw new Error(
    "[auth] El middleware no exporta una función. Revisa backend/src/middleware/auth.js"
  );
}

// Este wrapper admite tanto middleware directo como factory (p.ej. auth(true))
function authStrict(req, res, next) {
  const base = resolveAuth();
  // middleware estándar: (req,res,next)
  if (base.length >= 3) return base(req, res, next);

  // factory: (strict) => (req,res,next)
  try {
    const maybeMw = base(true);
    if (typeof maybeMw === "function") return maybeMw(req, res, next);
  } catch (e) {
    // si no es factory, continúa abajo
  }

  // última oportunidad: tratarlo como middleware directo igualmente
  return base(req, res, next);
}

// ---- RUTAS (mantenemos exactamente tus endpoints existentes) ----

// Listar citas (todas o por día con ?date=YYYY-MM-DD)
router.get("/", authStrict, ctrl.list);

// Historial del cliente autenticado (si lo usas)
router.get("/me", authStrict, ctrl.myHistory);

// Crear cita
router.post("/", authStrict, ctrl.create);

// Actualizar cita (p.ej. status: 'cancelled' al cancelar)
router.patch("/:id", authStrict, ctrl.update);

module.exports = router;
