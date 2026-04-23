function enrichProperty(property, users){
  const owner = users.find((user) => user.id === property.ownerId);

  return {
    ...property,
    ownerName: owner ? `${owner.nombre} ${owner.apellido}` : "Sin asignar",
    ownerRoles: owner ? owner.roles : [],
  };
}

module.exports = {
  enrichProperty,
};