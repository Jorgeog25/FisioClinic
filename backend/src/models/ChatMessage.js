const mongoose = require("mongoose");

const ChatMessageSchema = new mongoose.Schema(
  {
    room: { type: String, index: true, required: true }, // p.ej. client:<clientId>
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    userName: { type: String, required: true },
    text: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// índice para recuperar historial rápido por sala y fecha
ChatMessageSchema.index({ room: 1, createdAt: -1 });

module.exports = mongoose.model("ChatMessage", ChatMessageSchema);
