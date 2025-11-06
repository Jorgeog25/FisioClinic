require("dotenv").config();
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const http = require("http"); // Usamos http para crear el servidor
const socketIo = require("socket.io"); // Para trabajar con WebSockets

const connectDB = require("./src/config/db");

const authRoutes = require("./src/routes/auth.routes");
const clientRoutes = require("./src/routes/client.routes");
const availabilityRoutes = require("./src/routes/availability.routes");
const appointmentRoutes = require("./src/routes/appointment.routes");
const paymentRoutes = require("./src/routes/payment.routes");

const app = express();

// Crear servidor HTTP
const server = http.createServer(app);

// Crear una instancia de Socket.IO conectada al servidor
const io = socketIo(server);

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

connectDB();

app.get("/", (_, res) => res.json({ ok: true, service: "Fisio Clinic API" }));

// Rutas de la API
app.use("/api/auth", authRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/availability", availabilityRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/payments", paymentRoutes);

// Conexión a Socket.IO
io.on("connection", (socket) => {
  console.log("Nuevo cliente conectado");

  // Evento para recibir y emitir mensajes
  socket.on("sendMessage", (data) => {
    const { message, user } = data;
    // Emitimos el mensaje a todos los demás clientes conectados
    io.emit("receiveMessage", { message, user });
  });

  // Evento para detectar "escribiendo..."
  socket.on("typing", (data) => {
    socket.broadcast.emit("typing", data); // Emitir el mensaje a todos excepto el emisor
  });

  socket.on("disconnect", () => {
    console.log("Cliente desconectado");
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || "Internal Server Error" });
});

// Configurar el puerto y escuchar
const PORT = process.env.PORT || 4000; // ⚠️ usa 4000 para no chocar con Vite (3000)
server.listen(PORT, () =>
  console.log(`Fisio Clinic API running on http://localhost:${PORT}`)
);
