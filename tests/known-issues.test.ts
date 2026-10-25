// Problems found during the October 2026 review. Each test describes the
// expected behaviour and guards against the bug coming back.
// The deck-exhaustion test was a suspicion that did not reproduce; it stays
// as a guard.
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  startServer,
  createGame,
  setupGame,
  playRound,
  closeAll,
  wait,
  type TestServer,
} from "./helpers";

describe("known issues", () => {
  let server: TestServer;
  before(async () => {
    server = await startServer();
  });
  after(async () => {
    await server.stop();
  });

  it("a double click on 'start' starts only one round", async () => {
    const bots = await setupGame(server.url, 2);
    bots[0].room.send("start-game");
    bots[0].room.send("start-game");
    await bots[0].waitForPhase("play");
    await wait(300);
    assert.equal(bots[0].state!.nbRound, 1);
    await closeAll(bots);
  });

  it("'start' sent during a game is ignored", async () => {
    const bots = await setupGame(server.url, 2);
    bots[0].room.send("start-game");
    await bots[0].waitForPhase("play");
    bots[0].room.send("start-game");
    await wait(300);
    assert.equal(bots[0].state!.phase, "play");
    assert.equal(bots[0].state!.nbRound, 1);
    await closeAll(bots);
  });

  it("player names are capped at 20 characters", async () => {
    const host = await createGame(server.url, "x".repeat(100_000));
    assert.ok(host.me.name.length <= 20, `name length ${host.me.name.length}`);
    await closeAll([host]);
  });

  it("an empty or blank name falls back to a default", async () => {
    const host = await createGame(server.url, "");
    assert.ok(host.me.name.trim().length > 0);
    await closeAll([host]);
  });

  it("when the host leaves mid-game, another player becomes host and can rematch", async () => {
    const bots = await setupGame(server.url, 3, { maxRounds: 5 });
    const [host, p2, p3] = bots;
    host.room.send("start-game");
    await p2.waitForPhase("play");
    await host.leave(true);
    for (let round = 1; round <= 5; round++) await playRound([p2, p3]);
    const end = await p2.waitForPhase("gameover");
    assert.notEqual(end.hostId, host.id, "host must be reassigned");
    const newHost = [p2, p3].find((b) => b.id === end.hostId)!;
    newHost.room.send("rematch");
    await p2.waitFor((s) => s.phase !== "gameover", "rematch starts");
    await closeAll([p2, p3]);
  });

  it("a player who already validated stays validated when the round opens early", async () => {
    const bots = await setupGame(server.url, 3);
    const [a, b] = bots;
    a.room.send("start-game");
    await a.waitForPhase("ready");
    // Any message that re-checks the phase while in "ready" opens the round early...
    a.room.send("player-ready");
    await a.waitForPhase("play");
    await a.playAndValidate();
    await b.waitFor((s) => s.players[a.id].ready, "A validated");
    // ...then the original delayed transition fires (delay is 400 ms in tests).
    await wait(500);
    assert.equal(b.state!.players[a.id].ready, true, "A's validation was reset");
    await closeAll(bots);
  });

  it("8 players over 20 rounds, all changing hands twice, never run out of cards", async () => {
    const bots = await setupGame(server.url, 8, { maxRounds: 20 });
    bots[0].room.send("start-game");
    for (let round = 1; round <= 20; round++) {
      for (const b of bots) await b.waitFor((s) => s.phase === "play" && s.nbRound === round, `round ${round}`);
      if (round <= 2) {
        for (const b of bots) b.room.send("change-hand");
        for (const b of bots) await b.waitFor(() => b.me.hasChangedCard, "hand changed");
      }
      for (const b of bots) {
        const pick = b.state!.currentQuestion.pick;
        assert.ok(b.me.hand.length >= pick, `round ${round}: ${b.name} has ${b.me.hand.length} cards, needs ${pick}`);
      }
      await playRound(bots);
    }
    await closeAll(bots);
  });
});
