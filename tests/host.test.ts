// Host role when the host disconnects. The test script sets a 1-second
// reconnection window (BM2Q_RECONNECT_SECONDS=1) instead of 180 seconds.
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { Client } from "@colyseus/sdk";
import {
  startServer,
  setupGame,
  playRound,
  closeAll,
  Bot,
  type TestServer,
} from "./helpers";

describe("host role", () => {
  let server: TestServer;
  before(async () => {
    server = await startServer();
  });
  after(async () => {
    await server.stop();
  });

  it("moves to the next player as soon as the host's connection drops", async () => {
    const bots = await setupGame(server.url, 3, { maxRounds: 5 });
    const [host, p2, p3] = bots;
    const hostId = host.id;
    host.room.send("start-game");
    await p2.waitForPhase("play");

    await host.leave(false); // connection lost, not a deliberate leave
    await p2.waitFor((s) => !s.players[hostId].connected, "host shown disconnected");
    assert.equal(p2.state!.hostId, p2.id, "first still-connected player becomes host");

    // The game goes on and the new host can start a rematch.
    for (let round = 1; round <= 5; round++) await playRound([p2, p3]);
    await p2.waitForPhase("gameover");
    p2.room.send("rematch");
    await p3.waitFor((s) => s.phase === "play" && s.nbRound === 1, "rematch round 1");
    await closeAll([p2, p3]);
  });

  it("a former host who reconnects is a normal player", async () => {
    const bots = await setupGame(server.url, 2);
    const [host, p2] = bots;
    const hostId = host.id;
    const token = host.room.reconnectionToken;
    host.room.send("start-game");
    await p2.waitForPhase("play");

    await host.leave(false);
    await p2.waitFor((s) => s.hostId === p2.id, "p2 becomes host");
    const back = new Bot("P1 again", await new Client(server.url).reconnect(token));
    await p2.waitFor((s) => s.players[hostId].connected, "former host back");
    assert.equal(back.id, hostId);
    assert.equal(p2.state!.hostId, p2.id);
    await closeAll([back, p2]);
  });

  it("a host who leaves the lobby hands the role to the next player", async () => {
    const bots = await setupGame(server.url, 3);
    const [host, p2, p3] = bots;
    await host.leave(true);
    await p2.waitFor((s) => s.hostId === p2.id, "p2 becomes host");
    p2.room.send("start-game");
    await p3.waitForPhase("play");
    await closeAll([p2, p3]);
  });
});
