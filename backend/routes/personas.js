const express = require("express");
const ctrl = require("../controllers/persona.controller");

const router = express.Router();

// CRUD
router.get("/",     ctrl.listar);
router.get("/:id",  ctrl.obtener);
router.post("/",    ctrl.crear);
router.put("/:id",  ctrl.actualizar);
router.delete("/:id", ctrl.eliminar);

module.exports = router;
