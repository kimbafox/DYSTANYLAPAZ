const { readDb } = require("../data/store");
const { findSessionWithUser } = require("../data/auth-store");

async function getAuthenticatedRequest(req){
  const authHeader = String(req.headers.authorization || "");
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return null;

  const db = readDb();
  const session = await findSessionWithUser(token);
  if (!session) return null;

  return { db, token: session.token, user: session.user };
}

async function requireAuth(req, res, next){
  try {
    const auth = await getAuthenticatedRequest(req);
    if (!auth) {
      res.status(401).json({ error: "Sesion invalida o expirada." });
      return;
    }

    req.db = auth.db;
    req.token = auth.token;
    req.user = auth.user;
    next();
  } catch (error) {
    next(error);
  }
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