const { readDb } = require("../data/store");

function getAuthenticatedRequest(req){
  const authHeader = String(req.headers.authorization || "");
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return null;

  const db = readDb();
  const session = db.sessions.find((item) => item.token === token);
  if (!session) return null;

  const user = db.users.find((item) => item.id === session.userId);
  if (!user) return null;

  return { db, token, user };
}

function requireAuth(req, res, next){
  const auth = getAuthenticatedRequest(req);
  if (!auth) {
    res.status(401).json({ error: "Sesion invalida o expirada." });
    return;
  }

  req.db = auth.db;
  req.token = auth.token;
  req.user = auth.user;
  next();
}

function requireRole(roles){
  return (req, res, next) => {
    if (!roles.some((role) => req.user.roles.includes(role))) {
      res.status(403).json({ error: "No tienes permisos para esta accion." });
      return;
    }

    next();
  };
}

module.exports = {
  requireAuth,
  requireRole,
};