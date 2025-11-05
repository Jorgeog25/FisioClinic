const router = require('express').Router();
const { auth, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/appointment.controller');

// Listar citas por fecha (admin)
router.get('/', auth(true), requireRole('admin'), ctrl.listByDate);

// Resumen por días del rango (admin) 👇
router.get('/summary', auth(true), requireRole('admin'), ctrl.summary);

// Mis citas (cliente)
router.get('/me', auth(true), requireRole('client'), ctrl.my);

// Crear cita (cliente)
router.post('/', auth(true), requireRole('client'), ctrl.create);

module.exports = router;
