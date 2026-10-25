// Untrusted input from clients: garbage payloads, wrong phases, oversized
// messages and floods must never crash the server or stall a round.
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  startServer,
  setupGame,
  playRound,
  closeAll,
  wait,
  type Bot,
  type TestServer,
} from "./helpers";

// The server drops messages beyond 20 per second per player. Garbage is sent
// in smaller batches so it is actually processed rather than rate-limited.
const BATCH = 15;
const WINDOW_MS = 1100;

type Message = [type: string | number, payload: unknown];

async function sendPaced(bot: Bot, messages: Message[]) {
  for (let i = 0; i < messages.length; i += BATCH) {
    if (i > 0) await wait(WINDOW_MS);
    for (const [type, payload] of messages.slice(i, i + BATCH)) {
      bot.room.send(type as string, payload);
    }
  }
}

/** Spread messages over the bots (each has its own rate budget) and send. */
async function sendGarbage(bots: Bot[], messages: Message[]) {
  const perBot: Message[][] = bots.map(() => []);
  messages.forEach((m, i) => perBot[i % bots.length].push(m));
  await Promise.all(bots.map((b, i) => sendPaced(b, perBot[i])));
  // Let the last rate window expire before normal play resumes.
  await wait(WINDOW_MS);
}

const big = "x".repeat(3000); // large, but under the 4 KB transport limit
const garbage: unknown[] = [
  undefined,
  null,
  0,
  42,
  -1,
  true,
  "",
  big,
  [],
  [1, "a"],
  {},
  { uid: 42 },
  { uid: null },
  { uid: "nope" },
  { uid: big },
  { uid: { nested: 1 } },
  { targetId: 42 },
  { targetId: "nope" },
  { targetId: big },
  { targetId: ["a"] },
];
const fewGarbage: unknown[] = [undefined, 42, big, { uid: "nope" }, [1]];

function garbageFor(types: (string | number)[], payloads = fewGarbage): Message[] {
  return types.flatMap((t) => payloads.map((p): Message => [t, p]));
}

function assertAllConnected(bots: Bot[]) {
  for (const b of bots) {
    assert.ok(b.room.connection.isOpen, `${b.name} was disconnected`);
    for (const other of bots) {
      assert.equal(b.state!.players[other.id].connected, true, `${other.name} shown disconnected`);
    }
  }
}

describe("untrusted client input", () => {
  let server: TestServer;
  before(async () => {
    server = await startServer();
  });
  after(async () => {
    await server.stop();
  });

  it("garbage payloads for every message type, in every phase, leave the game playable", async () => {
    const bots = await setupGame(server.url, 4, { maxRounds: 5 });
    const [host, ...guests] = bots;

    // Lobby: guests (not host) send everything, including start-game.
    await sendGarbage(guests, [
      ...garbageFor(["start-game", "rematch", "player-ready", "change-hand", "validate-choice", "vote-pass", "unknown-message", 7]),
      ...garbageFor(["play-card", "vote-answer"], garbage),
    ]);
    assert.equal(host.state!.phase, "lobby", "a guest must not start the game");

    host.room.send("start-game");
    for (const b of bots) await b.waitForPhase("play");

    // Play: wrong-phase messages, unknown ids, malformed payloads. Votes
    // with a real target are out of phase and must be ignored too.
    await sendGarbage(bots, [
      ...garbageFor(["start-game", "rematch", "player-ready", "validate-choice", "vote-pass", "unknown-message", 7]),
      ...garbageFor(["play-card", "vote-answer"], garbage),
      ["vote-answer", { targetId: guests[0].id }],
    ]);
    assert.equal(host.state!.phase, "play");
    assert.equal(host.state!.nbRound, 1);
    for (const b of bots) assert.deepEqual(b.me.selectedCards, [], `${b.name} selection changed`);

    for (const b of bots) await b.playAndValidate();
    for (const b of bots) await b.waitForPhase("vote");

    // Vote: card plays with real uids are out of phase; self-votes refused.
    const ownCards: Message[] = bots.map((b) => ["play-card", { uid: b.me.hand[0].uid }]);
    await sendGarbage(bots, [
      ...garbageFor(["start-game", "rematch", "player-ready", "change-hand", "validate-choice", "unknown-message"]),
      ...garbageFor(["play-card", "vote-answer"], garbage),
      ...ownCards,
    ]);
    for (const b of bots) b.room.send("vote-answer", { targetId: b.id });
    await wait(200);
    assert.equal(host.state!.phase, "vote");
    for (const p of Object.values(host.state!.players)) assert.equal(p.hasVoted, false);

    for (const b of bots) b.vote();
    for (const b of bots) await b.waitForPhase("recap");
    // The next round runs normally.
    await playRound(bots);
    assert.equal(host.state!.nbRound, 2);
    assertAllConnected(bots);
    await closeAll(bots);
  });

  it("a message over the transport size limit only drops its sender", async () => {
    const bots = await setupGame(server.url, 3);
    const [a, b, c] = bots;
    a.room.send("start-game");
    for (const bot of bots) await bot.waitForPhase("play");
    a.room.send("play-card", { uid: "x".repeat(10_000) });
    await b.waitFor((s) => !s.players[a.id].connected, "sender disconnected");
    await playRound([b, c]);
    await closeAll(bots);
  });

  it("a flood of messages is cut at 20 per second without disconnecting the player", async () => {
    const bots = await setupGame(server.url, 2);
    const [a] = bots;
    a.room.send("start-game");
    for (const bot of bots) await bot.waitForPhase("play");
    await wait(WINDOW_MS); // start from a fresh rate window

    let acknowledged = 0;
    a.room.onMessage("player-update", () => acknowledged++);
    const uid = a.me.hand[0].uid;
    for (let i = 0; i < 60; i++) a.room.send("play-card", { uid });
    await wait(300);

    assert.ok(acknowledged > 0, "no message was processed");
    assert.ok(acknowledged <= 20, `${acknowledged} of 60 messages processed`);
    assert.ok(a.room.connection.isOpen, "flooding player was disconnected");

    // Once the burst is over, the player plays normally.
    await wait(WINDOW_MS);
    if (a.me.selectedCards.length > 0) {
      a.room.send("play-card", { uid }); // undo the leftover toggle
      await a.waitFor(() => a.me.selectedCards.length === 0, "selection cleared");
    }
    await playRound(bots);
    assertAllConnected(bots);
    await closeAll(bots);
  });
});
