const router = require('express').Router();
const { auth, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/appointment.controller');

// Client books a slot (must be authenticated client)
router.post('/', auth(true), ctrl.book);

// Admin can list by date; client can see their own
router.get('/', auth(false), ctrl.listByDate);
router.get('/me', auth(true), ctrl.my);

// Admin can update status/notes
router.put('/:id', auth(true), requireRole('admin'), ctrl.updateStatus);

module.exports = router;
