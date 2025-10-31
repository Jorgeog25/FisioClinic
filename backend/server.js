const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const dotenv = require("dotenv");

// Cargar variables de entorno
dotenv.config();

const personasRouter = require("./routes/personas");

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(morgan("combined"));

// Rutas API
app.use("/api/personas", personasRouter);

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, "../frontend")));

// Ruta raíz -> index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// Middleware de errores (centralizado)
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || "Error interno del servidor" });
});

// Conexión a Mongo y arranque del servidor
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/clinica_fisio";

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log("Conectado a MongoDB");
    app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error("Error al conectar a MongoDB", err);
    process.exit(1);
  });

module.exports = app;
