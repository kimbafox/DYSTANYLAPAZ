const { createToken } = require("../utils/security");

function createSession(db, userId){
  const token = createToken();
  db.sessions = db.sessions.filter((session) => session.userId !== userId);
  db.sessions.push({ token, userId, createdAt: new Date().toISOString() });
  return token;
}

function removeSession(db, token){
  db.sessions = db.sessions.filter((session) => session.token !== token);
}

module.exports = {
  createSession,
  removeSession,
};