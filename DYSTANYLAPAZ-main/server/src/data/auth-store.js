const { query } = require("./postgres");
const { createToken } = require("../utils/security");

function mapUser(row){
  if (!row) return null;

  return {
    id: row.id,
    nombre: row.nombre,
    apellido: row.apellido,
    correo: row.correo,
    passwordHash: row.password_hash,
    telefono: row.telefono,
    ci: row.ci,
    direccion: row.direccion,
    fechaNacimiento: row.fecha_nacimiento,
    roles: Array.isArray(row.roles) ? row.roles : [],
    creadoEn: row.creado_en,
  };
}

async function listUsers(){
  const result = await query(
    `
      SELECT id, nombre, apellido, correo, password_hash, telefono, ci, direccion, fecha_nacimiento, roles, creado_en
      FROM app_users
      ORDER BY creado_en ASC
    `
  );

  return result.rows.map(mapUser);
}

async function findUserByEmail(correo){
  const result = await query(
    `
      SELECT id, nombre, apellido, correo, password_hash, telefono, ci, direccion, fecha_nacimiento, roles, creado_en
      FROM app_users
      WHERE correo = $1
      LIMIT 1
    `,
    [correo]
  );

  return mapUser(result.rows[0]);
}

async function findUserById(id){
  const result = await query(
    `
      SELECT id, nombre, apellido, correo, password_hash, telefono, ci, direccion, fecha_nacimiento, roles, creado_en
      FROM app_users
      WHERE id = $1
      LIMIT 1
    `,
    [id]
  );

  return mapUser(result.rows[0]);
}

async function createUser(user){
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

  return findUserById(user.id);
}

async function deleteUserById(userId){
  await query("DELETE FROM app_users WHERE id = $1", [userId]);
}

async function createSession(userId){
  const token = createToken();
  await query("DELETE FROM user_sessions WHERE user_id = $1", [userId]);
  await query(
    `
      INSERT INTO user_sessions (token, user_id, created_at)
      VALUES ($1, $2, NOW())
    `,
    [token, userId]
  );

  return token;
}

async function removeSession(token){
  await query("DELETE FROM user_sessions WHERE token = $1", [token]);
}

async function findSessionWithUser(token){
  const result = await query(
    `
      SELECT
        session.token,
        user_row.id,
        user_row.nombre,
        user_row.apellido,
        user_row.correo,
        user_row.password_hash,
        user_row.telefono,
        user_row.ci,
        user_row.direccion,
        user_row.fecha_nacimiento,
        user_row.roles,
        user_row.creado_en
      FROM user_sessions AS session
      INNER JOIN app_users AS user_row ON user_row.id = session.user_id
      WHERE session.token = $1
      LIMIT 1
    `,
    [token]
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    token: row.token,
    user: mapUser(row),
  };
}

module.exports = {
  createSession,
  createUser,
  deleteUserById,
  findSessionWithUser,
  findUserByEmail,
  findUserById,
  listUsers,
  removeSession,
};
