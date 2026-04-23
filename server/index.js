const { port } = require("./src/config");
const { createApp } = require("./src/app");

const app = createApp();

app.listen(port, () => {
  console.log(`DYNApaz backend escuchando en http://localhost:${port}`);
});