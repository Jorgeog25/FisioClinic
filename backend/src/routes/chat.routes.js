const router = require("express").Router();
const ChatMessage = require("../models/ChatMessage");
const { auth } = require("../middleware/auth");

// GET /api/chat/:room/history?limit=50
router.get("/:room/history", auth(true), async (req, res, next) => {
  try {
    const { room } = req.params;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const rows = await ChatMessage
      .find({ room })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    // devolver ascendente para pintar cronológicamente
    res.json(rows.reverse());
  } catch (e) {
    next(e);
  }
});

module.exports = router;
