const router = require('express').Router();
const { auth, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/availability.controller');
const slots = require('../controllers/slots.controller');

router.get('/', auth, ctrl.listInRange);
router.post('/', auth, requireRole('admin'), ctrl.upsert);
router.get('/:date/slots', auth, slots.listSlots);

module.exports = router;
