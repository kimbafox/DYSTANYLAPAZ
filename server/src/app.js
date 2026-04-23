const express = require("express");
const { frontendDir } = require("./config");
const { ensureDatabase } = require("./data/store");
const { corsMiddleware } = require("./middleware/cors");
const healthRoutes = require("./routes/health.routes");
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/users.routes");
const propertyRoutes = require("./routes/properties.routes");

function createApp(){
  ensureDatabase();

  const app = express();
  app.use(express.json({ limit: "1mb" }));
  app.use(corsMiddleware);
  app.use(express.static(frontendDir));

  app.use("/api", healthRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/properties", propertyRoutes);

  app.get("/", (req, res) => {
    res.redirect("/login.html");
  });

  return app;
}

module.exports = {
  createApp,
};