const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..", "..");

module.exports = {
  port: process.env.PORT || 3000,
  rootDir: ROOT_DIR,
  frontendDir: path.join(ROOT_DIR, "frontend"),
  dataDir: path.join(ROOT_DIR, "data"),
  dbFile: path.join(ROOT_DIR, "data", "db.json"),
};