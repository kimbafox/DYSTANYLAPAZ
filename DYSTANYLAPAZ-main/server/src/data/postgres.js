const { Pool } = require("pg");
const { databaseUrl } = require("../config");
const { buildSeedDatabase } = require("../utils/seed");

if (!databaseUrl) {
  throw new Error("DATABASE_URL no esta configurada. Railway debe exponer la conexion de PostgreSQL.");
}

function resolveSslConfig(){
  const override = String(process.env.PGSSL || process.env.PGSSLMODE || "").toLowerCase();
  if (override === "false" || override === "disable") {
    return false;
  }

  if (databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1")) {
    return false;
  }

  return { rejectUnauthorized: false };
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: resolveSslConfig(),
});

async function query(text, params = []){
  return pool.query(text, params);
}

async function initPostgres(){
  await query(`
    CREATE TABLE IF NOT EXISTS app_users (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      apellido TEXT NOT NULL,
      correo TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      telefono TEXT NOT NULL,
      ci TEXT NOT NULL,
      direccion TEXT NOT NULL,
      fecha_nacimiento TEXT NOT NULL,
      roles JSONB NOT NULL DEFAULT '["usuario"]'::jsonb,
      creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query("CREATE INDEX IF NOT EXISTS idx_app_users_correo ON app_users(correo)");
  await query("CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id)");

  const { users } = buildSeedDatabase();
  for (const user of users) {
    await query(
      `
        INSERT INTO app_users (
          id,
          nombre,
          apellido,
          correo,
          password_hash,
          telefono,
          ci,
          direccion,
          fecha_nacimiento,
          roles,
          creado_en
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11)
        ON CONFLICT (id) DO NOTHING
      `,
      [
        user.id,
        user.nombre,
        user.apellido,
        user.correo,
        user.passwordHash,
        user.telefono,
        user.ci,
        user.direccion,
        user.fechaNacimiento,
        JSON.stringify(user.roles),
        user.creadoEn,
      ]
    );
  }
}

module.exports = {
  initPostgres,
  pool,
  query,
};
