// src/index.js
require("dotenv").config();
const { createServer } = require("http");
const app = require("./app");
const { initSocket } = require("./config/socket");

const PORT = process.env.PORT || 3001;

const httpServer = createServer(app);

// Inicializar Socket.io
initSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log(`🚀 AXF Chat Server corriendo en puerto ${PORT}`);
  console.log(`📡 WebSocket listo para conexiones en tiempo real`);
});
