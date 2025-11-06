const router = require('express').Router();
const { auth, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/appointment.controller');

// Listar citas por día
router.get('/', auth(true), ctrl.listByDate);

// Resumen entre fechas
router.get('/summary', auth(true), requireRole('admin'), ctrl.summary);

// Crear cita
router.post('/', auth(true), ctrl.create);

// 🔧 NUEVO: Actualizar cita (por ejemplo marcar como pagada)
router.patch('/:id', auth(true), requireRole('admin'), ctrl.update);

module.exports = router;
