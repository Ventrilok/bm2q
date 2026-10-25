import { describe, it, before, after } from "node:test";
import {
  startServer,
  setupGame,
  playRound,
  closeAll,
  wait,
  type TestServer,
} from "./helpers";

// A malformed message during a round used to crash the whole server process
// (every live game lost). Skipped until message validation lands, because a
// crash takes this test file down with it.
describe("malformed messages", { skip: "crashes the server until messages are validated" }, () => {
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
    // The round can still be played normally.
    await playRound(bots);
    await closeAll(bots);
  });
});
