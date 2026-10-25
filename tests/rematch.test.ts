// Rematch after players left. The test script sets a 1-second reconnection window.
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { startServer, setupGame, playRound, closeAll, wait, type TestServer } from "./helpers";

describe("rematch", () => {
  let server: TestServer;
  before(async () => {
    server = await startServer();
  });
  after(async () => {
    await server.stop();
  });

  it("players who left for good stay on the final scores, then are removed for the rematch", async () => {
    const bots = await setupGame(server.url, 4, { maxRounds: 5 });
    const [host, p2, p3, p4] = bots;
    host.room.send("start-game");
    await p4.waitForPhase("play");
    await p3.leave(true); // deliberate leave
    await p4.leave(false); // lost connection, never comes back
    await host.waitFor((s) => !s.players[p4.id].connected, "p4 disconnected");
    await wait(1500); // past p4's reconnection window

    for (let round = 1; round <= 5; round++) await playRound([host, p2]);
    const end = await host.waitForPhase("gameover");
    assert.ok(end.players[p3.id] && end.players[p4.id], "still listed on the final scores");

    host.room.send("rematch");
    const again = await host.waitFor((s) => s.phase === "play" && s.nbRound === 1, "rematch round 1");
    assert.deepEqual(Object.keys(again.players).sort(), [host.id, p2.id].sort());
    await playRound([host, p2]);
    await closeAll([host, p2]);
  });

  it("a player still within the reconnection window keeps their seat for the rematch", async () => {
    process.env.BM2Q_RECONNECT_SECONDS = "30";
    try {
      const bots = await setupGame(server.url, 3, { maxRounds: 5 });
      const [host, p2, p3] = bots;
      host.room.send("start-game");
      for (let round = 1; round <= 5; round++) await playRound(bots);
      await host.waitForPhase("gameover");
      await p3.leave(false); // dropped, may still come back
      await host.waitFor((s) => !s.players[p3.id].connected, "p3 disconnected");
      host.room.send("rematch");
      const again = await host.waitFor((s) => s.phase === "play" && s.nbRound === 1, "rematch round 1");
      assert.ok(again.players[p3.id], "seat kept");
      await closeAll([host, p2]);
    } finally {
      process.env.BM2Q_RECONNECT_SECONDS = "1";
    }
  });
});
