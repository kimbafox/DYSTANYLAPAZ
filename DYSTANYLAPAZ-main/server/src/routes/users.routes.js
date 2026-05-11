const express = require("express");
const { deleteUserById, findUserById, listUsers } = require("../data/auth-store");
const { writeDb } = require("../data/store");
const { requireAuth, requireRole } = require("../middleware/auth");
const { sanitizeUser } = require("../utils/validators");

const router = express.Router();

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const users = await listUsers();
    res.json({ users: users.map(sanitizeUser) });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", requireAuth, requireRole(["admin"]), async (req, res, next) => {
  try {
    const userId = req.params.id;

    if (req.user.id === userId) {
      res.status(400).json({ error: "El administrador no puede eliminar su propia cuenta activa." });
      return;
    }

    const user = await findUserById(userId);
    if (!user) {
      res.status(404).json({ error: "Usuario no encontrado." });
      return;
    }

    req.db.properties = req.db.properties.filter((property) => property.ownerId !== userId);
    writeDb(req.db);
    await deleteUserById(userId);

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;