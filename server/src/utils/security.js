const crypto = require("crypto");

function createId(prefix){
  return `${prefix}-${crypto.randomBytes(6).toString("hex")}`;
}

function createToken(){
  return crypto.randomBytes(24).toString("hex");
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")){
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash){
  const [salt, hash] = String(storedHash || "").split(":");
  if (!salt || !hash) return false;

  const inputHash = crypto.scryptSync(String(password || ""), salt, 64).toString("hex");
  const expected = Buffer.from(hash, "hex");
  const received = Buffer.from(inputHash, "hex");

  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}

module.exports = {
  createId,
  createToken,
  hashPassword,
  verifyPassword,
};