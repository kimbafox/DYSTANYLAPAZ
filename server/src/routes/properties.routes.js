const express = require("express");
const { writeDb } = require("../data/store");
const { requireAuth, requireRole } = require("../middleware/auth");
const { enrichProperty } = require("../services/property.service");
const { createId } = require("../utils/security");
const { validatePropertyPayload } = require("../utils/validators");

const router = express.Router();

router.get("/", requireAuth, (req, res) => {
  res.json({
    properties: req.db.properties.map((property) => enrichProperty(property, req.db.users)),
  });
});

router.post("/", requireAuth, requireRole(["admin", "vendedor"]), (req, res) => {
  const data = req.body || {};
  const validationError = validatePropertyPayload(data);

  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  const property = {
    id: createId("prop"),
    title: String(data.title).trim(),
    zone: String(data.zone).trim(),
    category: data.category,
    isNew: Boolean(data.isNew),
    priceBOB: Number(data.priceBOB),
    desc: String(data.desc).trim(),
    coords: data.coords.map(Number),
    images: data.images.map((item) => String(item).trim()).filter(Boolean),
    ownerId: req.user.id,
    createdAt: new Date().toISOString(),
  };

  req.db.properties.unshift(property);
  writeDb(req.db);

  res.status(201).json({ property: enrichProperty(property, req.db.users) });
});

router.delete("/:id", requireAuth, requireRole(["admin", "vendedor"]), (req, res) => {
  const property = req.db.properties.find((item) => item.id === req.params.id);
  if (!property) {
    res.status(404).json({ error: "Propiedad no encontrada." });
    return;
  }

  const canDelete = req.user.roles.includes("admin") || property.ownerId === req.user.id;
  if (!canDelete) {
    res.status(403).json({ error: "Solo puedes eliminar tus propias propiedades." });
    return;
  }

  req.db.properties = req.db.properties.filter((item) => item.id !== property.id);
  writeDb(req.db);

  res.json({ ok: true });
});

module.exports = router;