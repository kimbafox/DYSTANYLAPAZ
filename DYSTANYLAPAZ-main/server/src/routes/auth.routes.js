const express = require("express");
const { requireAuth } = require("../middleware/auth");
const {
  createSession,
  createUser,
  findUserByEmail,
  removeSession,
} = require("../data/auth-store");
const { createId, hashPassword, verifyPassword } = require("../utils/security");
const {
  normalizeEmail,
  normalizeRoles,
  sanitizeUser,
  validateEmail,
  validateRegistrationPayload,
} = require("../utils/validators");

const router = express.Router();

router.post("/register", async (req, res, next) => {
  try {
    const data = req.body || {};
    const validationError = validateRegistrationPayload(data);

    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

    const correo = normalizeEmail(data.correo);
    const existingUser = await findUserByEmail(correo);
    if (existingUser) {
      res.status(409).json({ error: "Ese correo ya esta registrado." });
      return;
    }

    const user = await createUser({
      id: createId("usr"),
      nombre: String(data.nombre).trim(),
      apellido: String(data.apellido).trim(),
      correo,
      passwordHash: hashPassword(String(data.password)),
      telefono: String(data.telefono).trim(),
      ci: String(data.ci).trim(),
      direccion: String(data.direccion).trim(),
      fechaNacimiento: String(data.fechaNacimiento).trim(),
      roles: normalizeRoles(data.roles),
      creadoEn: new Date().toISOString(),
    });

    const token = await createSession(user.id);
    res.status(201).json({ token, user: sanitizeUser(user) });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const correo = normalizeEmail(req.body?.correo);
    const password = String(req.body?.password || "");

    if (!validateEmail(correo)) {
      res.status(400).json({ error: "Correo invalido." });
      return;
    }

    const user = await findUserByEmail(correo);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      res.status(401).json({ error: "Correo o contrasena incorrectos." });
      return;
    }

    const token = await createSession(user.id);
    res.json({ token, user: sanitizeUser(user) });
  } catch (error) {
    next(error);
  }
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
});

router.post("/logout", requireAuth, async (req, res, next) => {
  try {
    await removeSession(req.token);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;