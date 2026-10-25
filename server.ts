import { createServer } from "http";
import next from "next";
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { registerRooms } from "./src/server/game-server";

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    // Liveness probe for Docker / load balancers
    const path = req.url?.split("?")[0];
    if (path === "/healthz" && (req.method === "GET" || req.method === "HEAD")) {
      res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      res.end(req.method === "HEAD" ? undefined : JSON.stringify({ status: "ok" }));
      return;
    }

    handle(req, res);
  });

  const transport = new WebSocketTransport({
    server: httpServer,
    pingInterval: 5000,
    pingMaxRetries: 3,
  });

  const gameServer = new Server({ transport });
  registerRooms(gameServer);

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
