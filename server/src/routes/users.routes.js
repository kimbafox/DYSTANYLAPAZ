const express = require("express");
const { writeDb } = require("../data/store");
const { requireAuth, requireRole } = require("../middleware/auth");
const { sanitizeUser } = require("../utils/validators");

const router = express.Router();

router.get("/", requireAuth, (req, res) => {
  res.json({ users: req.db.users.map(sanitizeUser) });
});

router.delete("/:id", requireAuth, requireRole(["admin"]), (req, res) => {
  const userId = req.params.id;

  if (req.user.id === userId) {
    res.status(400).json({ error: "El administrador no puede eliminar su propia cuenta activa." });
    return;
  }

  if (!req.db.users.some((user) => user.id === userId)) {
    res.status(404).json({ error: "Usuario no encontrado." });
    return;
  }

  req.db.users = req.db.users.filter((user) => user.id !== userId);
  req.db.sessions = req.db.sessions.filter((session) => session.userId !== userId);
  req.db.properties = req.db.properties.filter((property) => property.ownerId !== userId);
  writeDb(req.db);

  res.json({ ok: true });
});

module.exports = router;