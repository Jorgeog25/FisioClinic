const Order = require("../models/Order");
const Appointment = require("../models/Appointment");

module.exports = {
  Query: {
    allOrders: async (_, { status }, { user }) => {
      if (!user || user.role !== "admin") {
        throw new Error("No autorizado");
      }

      const filter = status ? { status } : {};
      return Order.find(filter).populate("appointments");
    },
  },

  Mutation: {
    payCart: async (_, __, { user }) => {
      if (!user) throw new Error("No autenticado");

      const appts = await Appointment.find({
        clientId: user.clientId,
        status: "pending_payment",
      });

      if (appts.length === 0) {
        throw new Error("Carrito vacío");
      }

      appts.forEach((a) => (a.status = "paid"));
      await Promise.all(appts.map((a) => a.save()));

      const order = await Order.create({
        userId: user.id,
        appointments: appts.map((a) => a._id),
        total: appts.length * 30,
        status: "completed",
      });

      return order.populate("appointments");
    },
  },
};
