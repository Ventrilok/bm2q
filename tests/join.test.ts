import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { Client } from "colyseus.js";
import {
  startServer,
  createGame,
  joinGame,
  setupGame,
  closeAll,
  type TestServer,
  type Bot,
} from "./helpers";
import { joinErrorMessage } from "../src/lib/use-game-room";

describe("joining a game by code", () => {
  let server: TestServer;
  before(async () => {
    server = await startServer();
  });
  after(async () => {
    await server.stop();
  });

  it("gives each game a 4-letter code that is also its join key", async () => {
    const host = await createGame(server.url, "Host");
    const code = host.state!.roomCode;
    assert.match(code, /^[A-Z]{4}$/);
    assert.equal(host.room.id, code);
    const guest = await joinGame(server.url, code, "Guest");
    await host.waitFor((s) => Object.keys(s.players).length === 2, "2 players");
    await closeAll([host, guest]);
  });

  it("does not list games publicly", async () => {
    const host = await createGame(server.url, "Host");
    const rooms = await new Client(server.url).getAvailableRooms("bm2q");
    assert.deepEqual(rooms, []);
    await closeAll([host]);
  });

  it("refuses an unknown code with 'Partie introuvable'", async () => {
    await assert.rejects(
      new Client(server.url).joinById("ZZZZ", { playerName: "X" }),
      (err: Error) => joinErrorMessage(err.message) === "Partie introuvable"
    );
  });

  it("refuses to join a game already started with 'Partie déjà commencée'", async () => {
    const bots = await setupGame(server.url, 2);
    bots[0].room.send("start-game");
    await bots[0].waitFor((s) => s.phase !== "lobby", "game started");
    await assert.rejects(
      new Client(server.url).joinById(bots[0].state!.roomCode, { playerName: "Late" }),
      (err: Error) => joinErrorMessage(err.message) === "Partie déjà commencée"
    );
    // The game keeps its two players.
    assert.equal(Object.keys(bots[0].state!.players).length, 2);
    await closeAll(bots);
  });

  it("refuses a 9th player with 'Partie complète'", async () => {
    const bots = await setupGame(server.url, 8);
    await assert.rejects(
      new Client(server.url).joinById(bots[0].state!.roomCode, { playerName: "Ninth" }),
      (err: Error) => joinErrorMessage(err.message) === "Partie complète"
    );
    await closeAll(bots);
  });

  it("never gives two live games the same code", async () => {
    const hosts: Bot[] = [];
    for (let i = 0; i < 60; i++) hosts.push(await createGame(server.url, `H${i}`));
    const codes = new Set(hosts.map((h) => h.state!.roomCode));
    assert.equal(codes.size, hosts.length);
    await closeAll(hosts);
  });
});
