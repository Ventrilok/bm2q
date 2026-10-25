import { Server } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { createServer } from "http";
import { registerRooms } from "./game-server";

const port = Number(process.env.COLYSEUS_PORT) || 2567;

const server = new Server({
  transport: new WebSocketTransport({
    server: createServer(),
  }),
});

registerRooms(server);

server.listen(port).then(() => {
  console.log(`🎮 BM2Q Colyseus server running on ws://localhost:${port}`);
});
