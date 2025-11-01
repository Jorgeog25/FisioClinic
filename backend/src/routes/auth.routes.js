const router = require('express').Router();
const { body } = require('express-validator');
const { auth, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/auth.controller');

// Registro PÚBLICO de CLIENTE
router.post(
  '/register-client',
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').notEmpty(),
  body('lastName').notEmpty(),
  body('phone').notEmpty(),
  ctrl.registerClient
);

// Registro ADMIN (crear admin o cliente)
router.post(
  '/register',
  auth(true),
  requireRole('admin'),
  body('email').isEmail().withMessage('Email no válido'),
  body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  body('role').isIn(['admin','client']).withMessage('Rol inválido'),
  ctrl.registerAny
);


// Login
router.post(
  '/register-client',
  body('email').isEmail().withMessage('Email no válido'),
  body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  body('firstName').notEmpty().withMessage('El nombre es obligatorio'),
  body('lastName').notEmpty().withMessage('Los apellidos son obligatorios'),
  body('phone').notEmpty().withMessage('El teléfono es obligatorio'),
  ctrl.registerClient
);


// Perfil
router.get('/me', auth(true), ctrl.me);

module.exports = router;
