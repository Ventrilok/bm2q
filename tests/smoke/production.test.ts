// Smoke test against a running production build (single port: site + game).
// Usage: SMOKE_URL=http://localhost:3000 npm run test:smoke
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createGame, joinGame, closeAll } from "../helpers";

const base = process.env.SMOKE_URL;

describe("production server", { skip: !base && "SMOKE_URL not set" }, () => {
  it("serves the home page and the lobby page", async () => {
    for (const path of ["/", "/lobby"]) {
      const res = await fetch(`${base}${path}`);
      assert.equal(res.status, 200, `${path} -> ${res.status}`);
    }
  });

  it("creates and joins a game over the same port", async () => {
    const wsUrl = base!.replace(/^http/, "ws");
    const host = await createGame(wsUrl, "Smoke host");
    const guest = await joinGame(wsUrl, host.state!.roomCode, "Smoke guest");
    await host.waitFor((s) => Object.keys(s.players).length === 2, "2 players");
    host.room.send("start-game");
    await guest.waitForPhase("play", 10000);
    await closeAll([host, guest]);
  });
});
