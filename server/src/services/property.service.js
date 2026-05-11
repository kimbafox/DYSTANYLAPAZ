function normalizePhone(phone){
  return String(phone || "").replace(/\D/g, "");
}

function buildWhatsappLink(phone, message = ""){
  const digits = normalizePhone(phone);
  if (!digits) return "";

  const fullNumber = digits.startsWith("591") ? digits : `591${digits}`;
  const text = String(message || "").trim();
  return `https://wa.me/${fullNumber}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

function normalizeProperty(property){
  return {
    ...property,
    status: property?.status === "vendida" ? "vendida" : "disponible",
  };
}

function buildOwnerSummary(owner, properties){
  if (!owner) return null;

  const ownerProperties = properties.filter((property) => property.ownerId === owner.id);
  const soldProperties = ownerProperties.filter((property) => property.status === "vendida");

  return {
    id: owner.id,
    nombreCompleto: `${owner.nombre} ${owner.apellido}`,
    correo: owner.correo,
    telefono: owner.telefono,
    roles: owner.roles || [],
    whatsappLink: buildWhatsappLink(owner.telefono),
    publishedCount: ownerProperties.length,
    soldCount: soldProperties.length,
    soldProperties: soldProperties.map((property) => ({
      id: property.id,
      title: property.title,
      zone: property.zone,
    })),
  };
}

function enrichProperty(property, users, properties = []){
  const normalizedProperty = normalizeProperty(property);
  const normalizedProperties = properties.map((item) => normalizeProperty(item));
  const owner = users.find((user) => user.id === normalizedProperty.ownerId);

  return {
    ...normalizedProperty,
    ownerName: owner ? `${owner.nombre} ${owner.apellido}` : "Sin asignar",
    ownerRoles: owner ? owner.roles : [],
    ownerPhone: owner?.telefono || "",
    ownerWhatsappLink: owner
      ? buildWhatsappLink(owner.telefono, `Hola ${owner.nombre}, vi tu propiedad ${normalizedProperty.title} en DYNApaz 87 y quiero mas informacion.`)
      : "",
    ownerSummary: buildOwnerSummary(owner, normalizedProperties),
  };
}

module.exports = {
  enrichProperty,
};