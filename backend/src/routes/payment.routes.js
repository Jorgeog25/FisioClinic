const router = require('express').Router();
const { auth, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/payment.controller');

router.post('/', auth(true), requireRole('admin'), ctrl.create);
router.get('/client/:clientId', auth(true), requireRole('admin'), ctrl.listByClient);

module.exports = router;
