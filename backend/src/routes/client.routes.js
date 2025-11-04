const router = require('express').Router();
const { auth, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/client.controller');

// Admin operations
router.get('/', auth(true), requireRole('admin'), ctrl.list);
router.post('/', auth(true), requireRole('admin'), ctrl.create);
router.get('/:id', auth(true), requireRole('admin'), ctrl.get);
router.put('/:id', auth(true), requireRole('admin'), ctrl.update);
router.delete('/:id', auth(true), requireRole('admin'), ctrl.remove);

// Client self history (shortcut): /clients/me
router.get('/me/history', auth(true), async (req, res, next) => {
  req.params.id = req.user.clientId;
  return ctrl.get(req, res, next);
});

module.exports = router;
