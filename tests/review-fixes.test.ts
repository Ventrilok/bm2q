// Edge cases found by the code review of the stabilisation branch.
// The test script sets a 1-second reconnection window.
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { Client } from "colyseus.js";
import {
  startServer,
  setupGame,
  playRound,
  closeAll,
  wait,
  Bot,
  type TestServer,
} from "./helpers";

describe("review fixes", () => {
  let server: TestServer;
  before(async () => {
    server = await startServer();
  });
  after(async () => {
    await server.stop();
  });

  it("a round resumes when a player comes back after everyone dropped", async () => {
    const bots = await setupGame(server.url, 2);
    const [a, b] = bots;
    a.room.send("start-game");
    await a.waitForPhase("play");
    await b.waitForPhase("play");
    await a.playAndValidate();
    await b.waitFor((s) => s.players[a.id].ready, "A validated");
    const token = a.room.reconnectionToken;

    await b.leave(false);
    await a.leave(false);
    await wait(100);
    const back = new Bot("A again", await new Client(server.url).reconnect(token));
    // A had validated and B is gone: the round must move on.
    await back.waitForPhase("vote", 3000);
    await closeAll([back]);
  });

  it("a rematch needs at least two connected players", async () => {
    const bots = await setupGame(server.url, 2, { maxRounds: 5 });
    const [host, p2] = bots;
    host.room.send("start-game");
    for (let round = 1; round <= 5; round++) await playRound(bots);
    await host.waitForPhase("gameover");
    await p2.leave(true);
    await host.waitFor((s) => !s.players[p2.id].connected, "p2 gone");
    host.room.send("rematch");
    await wait(300);
    assert.equal(host.state!.phase, "gameover");
    await closeAll([host]);
  });

  it("votes for a player who submitted no answer are ignored", async () => {
    const bots = await setupGame(server.url, 3);
    const [p1, p2, p3] = bots;
    p1.room.send("start-game");
    for (const b of bots) await b.waitForPhase("play");
    await p3.leave(true); // leaves without answering
    await p1.playAndValidate();
    await p2.playAndValidate();
    await p1.waitForPhase("vote");
    p1.room.send("vote-answer", { targetId: p3.id });
    await wait(200);
    assert.equal(p1.me.hasVoted, false, "vote for an empty answer must be refused");
    p1.room.send("vote-answer", { targetId: p2.id });
    await p1.waitFor(() => p1.me.hasVoted, "valid vote accepted");
    await closeAll([p1, p2]);
  });
});
