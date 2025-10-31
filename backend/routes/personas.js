const express = require("express");
const ctrl = require("../controllers/persona.controller");

const router = express.Router();

// CRUD básico
router.get("/", ctrl.listar);        // GET /api/personas?q=juan&page=1&limit=10
router.get("/:id", ctrl.obtener);    // GET /api/personas/:id
router.post("/", ctrl.crear);        // POST /api/personas
router.put("/:id", ctrl.actualizar); // PUT /api/personas/:id
router.delete("/:id", ctrl.eliminar);// DELETE /api/personas/:id

module.exports = router;
