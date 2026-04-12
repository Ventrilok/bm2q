import { createServer } from "http";
import next from "next";
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { BM2QRoom } from "./src/server/rooms/bm2q-room";

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  const transport = new WebSocketTransport({
    server: httpServer,
    pingInterval: 5000,
    pingMaxRetries: 3,
  });

  const gameServer = new Server({ transport });
  gameServer.define("bm2q", BM2QRoom);

  // Replace the auto-registered upgrade handlers with our own
  // so Next.js HMR WebSockets don't hit Colyseus
  httpServer.removeAllListeners("upgrade");
  httpServer.on("upgrade", (req, socket, head) => {
    // Skip Next.js HMR upgrades
    if (req.url?.startsWith("/_next/")) return;

    // Route to Colyseus
    (transport as any).wss.handleUpgrade(req, socket, head, (ws: any) => {
      (transport as any).wss.emit("connection", ws, req);
    });
  });

  gameServer.listen(port).then(() => {
    console.log(`🎮 BM2Q running on http://localhost:${port}`);
    console.log(`   Next.js: http://localhost:${port}`);
    console.log(`   Colyseus: ws://localhost:${port}`);
  });
});
