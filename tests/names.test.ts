import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { Client } from "@colyseus/sdk";
import { sanitizePlayerName } from "../src/server/rooms/bm2q-room";
import { startServer, createGame, joinGame, closeAll, Bot, type TestServer } from "./helpers";

describe("player names", () => {
  it("are trimmed, stripped of control characters and capped at 20 characters", () => {
    assert.equal(sanitizePlayerName("  Alice  "), "Alice");
    assert.equal(sanitizePlayerName("\u0000Bo\nb\u001b[31m\u007f"), "Bob[31m");
    assert.equal(sanitizePlayerName("a".repeat(25)), "a".repeat(20));
    assert.equal(sanitizePlayerName("Ünïcødé ok"), "Ünïcødé ok");
    // An emoji counts as one character and is never cut in half.
    assert.equal(sanitizePlayerName("😀".repeat(25)), "😀".repeat(20));
    assert.equal(sanitizePlayerName("x".repeat(19) + " y"), "x".repeat(19));
    for (const empty of ["", "   ", "\n\t", undefined, null, 42, {}, ["Bob"]]) {
      assert.equal(sanitizePlayerName(empty), "");
    }
  });

  describe("in a game", () => {
    let server: TestServer;
    before(async () => {
      server = await startServer();
    });
    after(async () => {
      await server.stop();
    });

    it("are cleaned before other players see them, with 'Joueur N' as fallback", async () => {
      const host = await createGame(server.url, "  \u0007Alice\r\n");
      const blank = await joinGame(server.url, host.state!.roomCode, " \t ");
      const room = await new Client(server.url).joinById(host.state!.roomCode, {
        playerName: { not: "a string" },
      });
      const odd = new Bot("odd", room);
      await host.waitFor((s) => Object.keys(s.players).length === 3, "3 players");
      const names = Object.values(host.state!.players).map((p) => p.name);
      assert.deepEqual(names, ["Alice", "Joueur 2", "Joueur 3"]);
      await closeAll([host, blank, odd]);
    });
  });
});
