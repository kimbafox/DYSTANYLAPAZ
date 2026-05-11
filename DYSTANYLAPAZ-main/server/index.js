const { port } = require("./src/config");
const { createApp } = require("./src/app");

async function start(){
  const app = await createApp();

  app.listen(port, () => {
    console.log(`DYNApaz backend escuchando en http://localhost:${port}`);
  });
}

start().catch((error) => {
  console.error("No se pudo iniciar DYNApaz:", error);
  process.exit(1);
});