import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  startServer,
  setupGame,
  playRound,
  closeAll,
  wait,
  type TestServer,
} from "./helpers";

// A malformed message during a round used to crash the whole server process
// (every live game lost).
describe("malformed messages", () => {
  let server: TestServer;
  before(async () => {
    server = await startServer();
  });
  after(async () => {
    await server.stop();
  });

  it("do not crash the server or block the round", async () => {
    const bots = await setupGame(server.url, 2);
    bots[0].room.send("start-game");
    await bots[0].waitForPhase("play");
    bots[0].room.send("play-card");
    bots[0].room.send("play-card", { uid: 42 });
    bots[0].room.send("vote-answer");
    bots[0].room.send("unknown-message", { x: 1 });
    await wait(200);
    // The sender is still in the game and the round can be played normally.
    assert.ok(bots[0].room.connection.isOpen, "sender was disconnected");
    await playRound(bots);
    assert.equal(bots[1].state!.players[bots[0].id].connected, true);
    await closeAll(bots);
  });
});
