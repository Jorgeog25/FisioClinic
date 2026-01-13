require("dotenv").config();
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const http = require("http");
const jwt = require("jsonwebtoken");
const { ApolloServer } = require("@apollo/server");

const typeDefs = require("./src/graphql/schema");
const resolvers = require("./src/graphql/resolvers");
const { auth } = require("./src/middleware/auth");




const connectDB = require("./src/config/db");

const authRoutes = require("./src/routes/auth.routes");
const clientRoutes = require("./src/routes/client.routes");
const availabilityRoutes = require("./src/routes/availability.routes");
const appointmentRoutes = require("./src/routes/appointment.routes");
const paymentRoutes = require("./src/routes/payment.routes");
const chatRoutes = require("./src/routes/chat.routes");

const ChatMessage = require("./src/models/ChatMessage");

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

connectDB();

app.get("/", (_, res) => res.json({ ok: true, service: "Fisio Clinic API" }));

app.use("/api/auth", authRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/availability", availabilityRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/chat", chatRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || "Internal Server Error" });
});

const PORT = process.env.PORT || 4000;
const server = http.createServer(app);

/* ================= Socket.IO ================= */
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

function verifySocketAuth(socket, next) {
  // token opcional: socket.auth.token (en el cliente puedes no enviarlo si no quieres atar a usuario)
  const token = socket.handshake.auth?.token;
  if (!token) return next(); // seguimos sin usuario (aceptamos anónimo con nombre que envía el cliente)
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = { id: payload.id, email: payload.email, role: payload.role };
  } catch {
    // token inválido → seguimos sin usuario; si quieres bloquear, llama next(new Error(...))
  }
  next();
}
io.use(verifySocketAuth);

// mapa de presencia: room -> Map(socketId -> displayName)
const presence = new Map();

function broadcastPresence(room) {
  const users = Array.from(presence.get(room)?.values() || []);
  io.to(room).emit("presence", { room, users }); // ['Jorge', 'Admin']
}

io.on("connection", (socket) => {
  // joinRoom {room, user}
  socket.on("joinRoom", ({ room, user }) => {
    if (!room) return;
    socket.join(room);
    if (!presence.has(room)) presence.set(room, new Map());
    presence.get(room).set(socket.id, user || socket.user?.email || "Usuario");
    broadcastPresence(room);
  });

  // typing {room, user}
  socket.on("typing", ({ room, user }) => {
    if (!room) return;
    socket.to(room).emit("typing", { room, user: user || "Usuario" });
  });

  // sendMessage {room, message, user}
  socket.on("sendMessage", async ({ room, message, user }) => {
    if (!room || !message) return;
    const payload = {
      room,
      text: String(message).slice(0, 2000),
      userName: user || socket.user?.email || "Usuario",
      userId: socket.user?.id || null,
    };
    // persistir
    await ChatMessage.create(payload);
    // y emitir
    io.to(room).emit("receiveMessage", { room, ...payload });
  });

  socket.on("leaveRoom", ({ room }) => {
    if (room) socket.leave(room);
    if (presence.has(room)) {
      presence.get(room).delete(socket.id);
      broadcastPresence(room);
    }
  });

  socket.on("disconnect", () => {
    // limpiar presencia en todas las salas
    for (const [room, map] of presence.entries()) {
      if (map.delete(socket.id)) broadcastPresence(room);
    }
  });
});

/* ================= GraphQL ================= */
async function startGraphQL() {
  const apolloServer = new ApolloServer({
    typeDefs: require("./src/graphql/schema"),
    resolvers: require("./src/graphql/resolvers"),
  });

  await apolloServer.start();

  app.post(
  "/graphql",
  auth(),
  express.json(),
  async (req, res) => {
    console.log("USER EN GRAPHQL:", req.user);

    const response = await apolloServer.executeOperation(
      {
        query: req.body.query,
        variables: req.body.variables,
      },
      {
        contextValue: {
          user: {
            ...req.user,
            clientId: req.user?.clientId,
          },
        },
      }
    );

    if (response.errors) {
      console.error("GRAPHQL ERRORS:", response.errors);
    }

    res.status(200).json(response);
  }
);
}

startGraphQL();


server.listen(PORT, () =>
  console.log(`Fisio Clinic API + Socket.IO running on http://localhost:${PORT}`)
);
