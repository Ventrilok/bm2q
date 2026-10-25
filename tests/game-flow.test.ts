import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  startServer,
  setupGame,
  playRound,
  closeAll,
  type TestServer,
} from "./helpers";

describe("a full game", () => {
  let server: TestServer;
  before(async () => {
    server = await startServer();
  });
  after(async () => {
    await server.stop();
  });

  it("plays 5 rounds with 3 players, ends with a winner, then rematches", async () => {
    const bots = await setupGame(server.url, 3, { maxRounds: 5 });
    const [host] = bots;
    host.room.send("start-game");

    for (let round = 1; round <= 5; round++) {
      await playRound(bots);
      assert.equal(host.state!.nbRound, round);
    }
    const end = await host.waitForPhase("gameover");
    assert.ok(end.winnerId, "a winner is designated");
    const totalScore = Object.values(end.players).reduce((n, p) => n + p.score, 0);
    assert.ok(totalScore >= 5, `each round awards at least one point (got ${totalScore})`);

    host.room.send("rematch");
    const again = await host.waitFor((s) => s.phase === "play" && s.nbRound === 1, "rematch round 1");
    for (const p of Object.values(again.players)) assert.equal(p.score, 0);
    await closeAll(bots);
  });

  it("deals a full hand to each player and hides other players' hands", async () => {
    const bots = await setupGame(server.url, 3);
    bots[0].room.send("start-game");
    for (const b of bots) await b.waitForPhase("play");
    for (const b of bots) {
      assert.equal(b.me.hand.length, 8);
      for (const other of bots.filter((o) => o !== b)) {
        assert.deepEqual(b.state!.players[other.id].hand, []);
      }
    }
    await closeAll(bots);
  });

});
