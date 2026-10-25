import { createServer } from "http";
import next from "next";
import { Server } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { registerRooms } from "./src/server/game-server";

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  const httpServer = createServer();
  const transport = new WebSocketTransport({ noServer: true, pingInterval: 5000, pingMaxRetries: 3 });
  // Game websockets only; Next.js dev reload sockets under /_next/ are left alone.
  transport.attachToServer(httpServer, { filter: (req) => !req.url?.startsWith("/_next/") });

  const gameServer = new Server({
    transport,
    express: (expressApp) => {
      expressApp.disable("x-powered-by");
      // Colyseus adds permissive CORS headers to every response; the site and
      // the game share one origin, so pages and the health check do not need them.
      expressApp.use((_req, res, nextHandler) => {
        for (const header of res.getHeaderNames()) {
          if (header.startsWith("access-control-")) res.removeHeader(header);
        }
        nextHandler();
      });
      expressApp.get("/healthz", (_req, res) => {
        res.set("Cache-Control", "no-store").json({ status: "ok" });
      });
      expressApp.use((req, res) => handle(req, res));
    },
  });
  registerRooms(gameServer);
  await gameServer.listen(port);
  console.log(`🎮 BM2Q running on http://localhost:${port}`);
});
