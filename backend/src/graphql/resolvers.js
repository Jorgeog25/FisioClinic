const Order = require("../models/Order");
const Appointment = require("../models/Appointment");

module.exports = {
  Query: {
    allOrders: async (_, { status }, { user }) => {
      if (!user || user.role !== "admin") {
        throw new Error("No autorizado");
      }

      const filter = {};
      if (status) {
        filter.status = status;
      }

      const orders = await Order.find(filter)
        .populate({
          path: "appointments",
          populate: {
            path: "clientId",
            select: "firstName lastName",
          },
        })
        .sort({ createdAt: -1 })
        .lean();

      return orders;
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

      // Marcar citas como pagadas
      await Promise.all(
        appts.map((a) =>
          Appointment.findByIdAndUpdate(a._id, { status: "paid" })
        )
      );

      // Crear pedido
      const order = await Order.create({
        userId: user.id,
        appointments: appts.map((a) => a._id),
        total: appts.length * 30,
        status: "completed",
      });

      // Devolver pedido correctamente poblado
      return Order.findById(order._id)
        .populate({
          path: "appointments",
          populate: {
            path: "clientId",
            select: "firstName lastName reason",
          },
        })
        .populate("userId", "email role")
        .lean();
    },
  },
};
