// Getting a seat back after a dropped connection or a page refresh.
// The test script sets a 1-second reconnection window on the server.
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { Client, CloseCode } from "@colyseus/sdk";
import {
  startServer,
  setupGame,
  playRound,
  closeAll,
  wait,
  Bot,
  type TestServer,
} from "./helpers";

describe("reconnection", () => {
  let server: TestServer;
  before(async () => {
    server = await startServer();
  });
  after(async () => {
    await server.stop();
  });

  it("a dropped player gets their seat back automatically and keeps playing", async () => {
    const bots = await setupGame(server.url, 2);
    const [a, b] = bots;
    a.room.reconnection.minUptime = 0;
    a.room.send("start-game");
    await a.waitForPhase("play");
    await b.waitForPhase("play");
    const handBefore = a.me.hand.map((c) => c.uid);
    let dropped = false;
    let reconnected = false;
    a.room.onDrop(() => (dropped = true));
    a.room.onReconnect(() => (reconnected = true));

    // Simulate a network drop (not a deliberate leave).
    a.room.connection.close(CloseCode.MAY_TRY_RECONNECT);
    await b.waitFor((s) => !s.players[a.id].connected, "A shown disconnected");
    await b.waitFor((s) => s.players[a.id].connected, "A back", 5000);

    assert.ok(dropped && reconnected, "drop and reconnect events fired");
    assert.deepEqual(a.me.hand.map((c) => c.uid), handBefore, "same hand after reconnecting");
    await playRound(bots);
    await closeAll(bots);
  });

  it("a page refresh in the lobby keeps the seat (reconnection token)", async () => {
    const bots = await setupGame(server.url, 2);
    const [host, p2] = bots;
    const token = p2.room.reconnectionToken;
    await p2.leave(false); // the old page goes away without leaving
    await host.waitFor((s) => s.players[p2.id] && !s.players[p2.id].connected, "p2 shown disconnected");

    const back = new Bot("P2 again", await new Client(server.url).reconnect(token));
    await host.waitFor((s) => s.players[p2.id]?.connected, "p2 back");
    assert.equal(back.id, p2.id);
    host.room.send("start-game");
    await back.waitForPhase("play");
    await closeAll([host, back]);
  });

  it("a lobby seat is freed once the reconnection window expires", async () => {
    const bots = await setupGame(server.url, 3);
    const [host, p2, p3] = bots;
    const token = p3.room.reconnectionToken;
    await p3.leave(false);
    await host.waitFor((s) => !s.players[p3.id], "p3 removed from the lobby", 4000);
    // Coming back too late is refused (the app then shows "place expirée").
    await assert.rejects(new Client(server.url).reconnect(token));
    await closeAll([host, p2]);
  });

  it("a game cannot start while only one player is connected", async () => {
    const bots = await setupGame(server.url, 2);
    const [host, p2] = bots;
    await p2.leave(false);
    await host.waitFor((s) => !s.players[p2.id]?.connected, "p2 disconnected");
    host.room.send("start-game");
    await wait(200);
    assert.equal(host.state!.phase, "lobby");
    await closeAll([host]);
  });

  it("the host role moves on when the host drops in the lobby", async () => {
    const bots = await setupGame(server.url, 3);
    const [host, p2, p3] = bots;
    await host.leave(false);
    await p2.waitFor((s) => s.hostId === p2.id, "p2 becomes host");
    p2.room.send("start-game");
    await p3.waitForPhase("play");
    await closeAll([p2, p3]);
  });
});
