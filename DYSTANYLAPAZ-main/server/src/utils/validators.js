function validateEmail(email){
  return /^[a-zA-Z0-9._%+-]+@(gmail\.com|hotmail\.com)$/.test(
    String(email || "").trim().toLowerCase()
  );
}

function normalizeEmail(email){
  return String(email || "").trim().toLowerCase();
}

function normalizeRoles(roles){
  const incoming = Array.isArray(roles) ? roles : [];
  const allowed = incoming.filter((role) => role === "usuario" || role === "vendedor");

  if (allowed.includes("vendedor") && !allowed.includes("usuario")) {
    allowed.push("usuario");
  }

  return allowed.length ? [...new Set(allowed)] : ["usuario"];
}

function sanitizeUser(user){
  return {
    id: user.id,
    nombre: user.nombre,
    apellido: user.apellido,
    correo: user.correo,
    telefono: user.telefono,
    ci: user.ci,
    direccion: user.direccion,
    fechaNacimiento: user.fechaNacimiento,
    roles: user.roles,
    creadoEn: user.creadoEn,
  };
}

function validateRegistrationPayload(data){
  if (!data.nombre || !data.apellido) {
    return "Ingresa nombre y apellido.";
  }

  if (!validateEmail(data.correo)) {
    return "Solo se permiten correos Gmail o Hotmail.";
  }

  if (!data.password || String(data.password).length < 6) {
    return "La contrasena debe tener al menos 6 caracteres.";
  }

  if (!data.ci || !data.telefono || !data.direccion || !data.fechaNacimiento) {
    return "Completa todos los datos personales.";
  }

  return "";
}

function validatePropertyPayload(data){
  if (!data.title || !data.zone || !data.desc) {
    return "Completa titulo, zona y descripcion.";
  }

  if (!["alto", "medio", "economico"].includes(data.category)) {
    return "Categoria invalida.";
  }

  if (!Number.isFinite(Number(data.priceBOB)) || Number(data.priceBOB) <= 0) {
    return "Ingresa un precio valido en bolivianos.";
  }

  const coords = Array.isArray(data.coords) ? data.coords.map(Number) : [];
  if (coords.length !== 2 || coords.some((value) => !Number.isFinite(value))) {
    return "Las coordenadas deben tener latitud y longitud validas.";
  }

  const images = Array.isArray(data.images)
    ? data.images.map((item) => String(item).trim()).filter(Boolean)
    : [];

  if (!images.length) {
    return "Debes enviar al menos una imagen.";
  }

  return "";
}

module.exports = {
  normalizeEmail,
  normalizeRoles,
  sanitizeUser,
  validateEmail,
  validatePropertyPayload,
  validateRegistrationPayload,
};