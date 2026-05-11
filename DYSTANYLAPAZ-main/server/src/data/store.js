const fs = require("fs");
const { dataDir, dbFile } = require("../config");
const { buildSeedDatabase } = require("../utils/seed");

function ensureDatabase(){
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(dbFile)) {
    fs.writeFileSync(dbFile, JSON.stringify(buildSeedDatabase(), null, 2));
  }
}

function readDb(){
  ensureDatabase();
  return JSON.parse(fs.readFileSync(dbFile, "utf8"));
}

function writeDb(db){
  fs.writeFileSync(dbFile, JSON.stringify(db, null, 2));
}

module.exports = {
  ensureDatabase,
  readDb,
  writeDb,
};