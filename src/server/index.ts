import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { createServer } from "http";
import { BM2QRoom } from "./rooms/bm2q-room";

const port = Number(process.env.COLYSEUS_PORT) || 2567;

const server = new Server({
  transport: new WebSocketTransport({
    server: createServer(),
  }),
});

server.define("bm2q", BM2QRoom);

server.listen(port).then(() => {
  console.log(`🎮 BM2Q Colyseus server running on ws://localhost:${port}`);
});
