const { hashPassword } = require("./security");

function buildSeedDatabase(){
  const now = new Date().toISOString();

  return {
    users: [
      {
        id: "admin-base",
        nombre: "Admin",
        apellido: "DYNApaz",
        correo: "admin@gmail.com",
        passwordHash: hashPassword("Admin123"),
        telefono: "70000001",
        ci: "1000001 LP",
        direccion: "Oficina central, La Paz",
        fechaNacimiento: "1990-01-01",
        roles: ["admin"],
        creadoEn: now,
      },
      {
        id: "vendedor-base",
        nombre: "Lucia",
        apellido: "Quispe",
        correo: "vendedor@gmail.com",
        passwordHash: hashPassword("Vendedor123"),
        telefono: "70000002",
        ci: "1000002 LP",
        direccion: "Calacoto, La Paz",
        fechaNacimiento: "1994-05-18",
        roles: ["usuario", "vendedor"],
        creadoEn: now,
      },
      {
        id: "usuario-base",
        nombre: "Mario",
        apellido: "Choque",
        correo: "usuario@gmail.com",
        passwordHash: hashPassword("Usuario123"),
        telefono: "70000003",
        ci: "1000003 LP",
        direccion: "Miraflores, La Paz",
        fechaNacimiento: "1998-10-09",
        roles: ["usuario"],
        creadoEn: now,
      },
    ],
    properties: [
      {
        id: "lp-001",
        title: "Casa moderna en Calacoto",
        zone: "Zona Sur • Calacoto",
        category: "alto",
        isNew: true,
        priceBOB: 1705200,
        desc: "4 dormitorios, garaje, jardín, excelente iluminación. Cerca a avenidas principales.",
        coords: [-16.5406, -68.0775],
        images: [
          "./assets/houses/casa1_1.jpg",
          "./assets/houses/casa1_2.jpg",
          "./assets/houses/casa1_3.jpg"
        ],
        ownerId: "vendedor-base",
        createdAt: now,
      },
      {
        id: "lp-002",
        title: "Departamento cómodo en Miraflores",
        zone: "Centro • Miraflores",
        category: "medio",
        isNew: false,
        priceBOB: 682080,
        desc: "2 dormitorios, balcón, cerca a hospitales y universidades. Ideal para familia pequeña.",
        coords: [-16.5, -68.1223],
        images: [
          "./assets/houses/casa2_1.jpg",
          "./assets/houses/casa2_2.jpg"
        ],
        ownerId: "vendedor-base",
        createdAt: now,
      },
      {
        id: "lp-003",
        title: "Casa económica en El Alto (zona límite)",
        zone: "Norte • Sector accesible",
        category: "economico",
        isNew: false,
        priceBOB: 361920,
        desc: "3 dormitorios, patio, buena proyección. Perfecta para primera compra.",
        coords: [-16.4897, -68.162],
        images: [
          "./assets/houses/casa3_1.jpg",
          "./assets/houses/casa3_2.jpg"
        ],
        ownerId: "admin-base",
        createdAt: now,
      },
      {
        id: "lp-004",
        title: "Nueva residencia cerca de Achumani",
        zone: "Zona Sur • Achumani",
        category: "alto",
        isNew: true,
        priceBOB: 2157600,
        desc: "Acabados premium, 5 dormitorios, terraza, vista panorámica. Zona segura.",
        coords: [-16.5238, -68.0649],
        images: [
          "./assets/houses/casa4_1.jpg",
          "./assets/houses/casa4_2.jpg",
          "./assets/houses/casa4_3.jpg"
        ],
        ownerId: "admin-base",
        createdAt: now,
      },
    ],
    sessions: [],
  };
}

module.exports = {
  buildSeedDatabase,
};