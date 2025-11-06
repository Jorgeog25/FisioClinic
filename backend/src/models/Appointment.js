const { Schema, model } = require("mongoose");

const AppointmentSchema = new Schema(
  {
    date: { type: String, required: true }, // "YYYY-MM-DD"
    time: { type: String, required: true }, // "HH:mm"
    clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true },
    status: {
      type: String,
      enum: ["reserved", "in_process", "pending_payment", "paid", "cancelled"],
      default: "reserved",
    },
  },
  { timestamps: true }
);

AppointmentSchema.index({ date: 1, time: 1 });
AppointmentSchema.index({ clientId: 1 });

module.exports = model("Appointment", AppointmentSchema);
