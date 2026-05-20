import http from "http";
import { Server } from "socket.io";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { registerSocketHandlers } from "./sockets/index.js";

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: env.CLIENT_URL
  }
});

registerSocketHandlers(io);

server.listen(env.PORT, () => {
  logger.info(`SMS API listening on port ${env.PORT}`);
});
