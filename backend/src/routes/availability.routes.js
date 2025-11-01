const router = require('express').Router();
const { auth, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/availability.controller');

// Admin sets active days and working hours window
router.post('/', auth(true), requireRole('admin'), ctrl.setDay);

// Anyone can read the calendar (to highlight active days)
router.get('/', ctrl.getCalendar);

// Slots for a given date
router.get('/:date/slots', ctrl.getDaySlots);

module.exports = router;
