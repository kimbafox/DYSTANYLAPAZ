const express = require("express");
const { readDb, writeDb } = require("../data/store");
const { requireAuth } = require("../middleware/auth");
const { createSession, removeSession } = require("../services/session.service");
const { createId, hashPassword, verifyPassword } = require("../utils/security");
const {
  normalizeEmail,
  normalizeRoles,
  sanitizeUser,
  validateEmail,
  validateRegistrationPayload,
} = require("../utils/validators");

const router = express.Router();

router.post("/register", (req, res) => {
  const db = readDb();
  const data = req.body || {};
  const validationError = validateRegistrationPayload(data);

  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  const correo = normalizeEmail(data.correo);
  if (db.users.some((user) => user.correo === correo)) {
    res.status(409).json({ error: "Ese correo ya esta registrado." });
    return;
  }

  const user = {
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
  };

  db.users.push(user);
  const token = createSession(db, user.id);
  writeDb(db);

  res.status(201).json({ token, user: sanitizeUser(user) });
});

router.post("/login", (req, res) => {
  const db = readDb();
  const correo = normalizeEmail(req.body?.correo);
  const password = String(req.body?.password || "");

  if (!validateEmail(correo)) {
    res.status(400).json({ error: "Correo invalido." });
    return;
  }

  const user = db.users.find((item) => item.correo === correo);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    res.status(401).json({ error: "Correo o contrasena incorrectos." });
    return;
  }

  const token = createSession(db, user.id);
  writeDb(db);
  res.json({ token, user: sanitizeUser(user) });
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
});

router.post("/logout", requireAuth, (req, res) => {
  removeSession(req.db, req.token);
  writeDb(req.db);
  res.json({ ok: true });
});

module.exports = router;