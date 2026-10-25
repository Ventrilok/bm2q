// Test harness: runs a real game server in-process and drives it with
// automated players ("bots") through the same client library as the app.
import { createServer, type Server as HttpServer } from "http";
import type { AddressInfo } from "net";
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { Client, type Room } from "colyseus.js";
import { registerRooms } from "../src/server/game-server";

export interface TestServer {
  url: string;
  stop: () => Promise<void>;
}

export async function startServer(): Promise<TestServer> {
  const httpServer: HttpServer = createServer();
  const gameServer = new Server({
    transport: new WebSocketTransport({ server: httpServer }),
  });
  registerRooms(gameServer);
  await gameServer.listen(0);
  const { port } = httpServer.address() as AddressInfo;
  return {
    url: `ws://127.0.0.1:${port}`,
    stop: async () => {
      await gameServer.gracefullyShutdown(false);
    },
  };
}

export const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface SyncPlayer {
  id: string;
  name: string;
  ready: boolean;
  score: number;
  hand: { uid: string; text: string }[];
  selectedCards: { uid: string; text: string }[];
  hasVoted: boolean;
  connected: boolean;
  changeQuota: number;
  hasChangedCard: boolean;
}

export interface SyncState {
  roomCode: string;
  phase: string;
  hostId: string;
  nbRound: number;
  maxRounds: number;
  currentQuestion: { text: string; pick: number };
  players: Record<string, SyncPlayer>;
  winnerId: string;
}

export class Bot {
  state: SyncState | null = null;
  syncCount = 0;

  constructor(public readonly name: string, public readonly room: Room) {
    room.onMessage("sync-state", (data: SyncState) => {
      this.state = data;
      this.syncCount++;
    });
    room.onMessage("player-update", (data: Partial<SyncPlayer>) => {
      if (!this.state) return;
      const me = this.state.players[room.sessionId];
      if (me) Object.assign(me, data);
    });
  }

  get id() {
    return this.room.sessionId;
  }

  get me(): SyncPlayer {
    const p = this.state?.players[this.id];
    if (!p) throw new Error(`${this.name}: no player state yet`);
    return p;
  }

  async waitFor(
    predicate: (s: SyncState) => boolean,
    what: string,
    timeoutMs = 5000
  ): Promise<SyncState> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (this.state && predicate(this.state)) return this.state;
      await wait(20);
    }
    throw new Error(
      `${this.name}: timed out waiting for ${what} (phase=${this.state?.phase} round=${this.state?.nbRound})`
    );
  }

  waitForPhase(phase: string, timeoutMs?: number) {
    return this.waitFor((s) => s.phase === phase, `phase ${phase}`, timeoutMs);
  }

  /** Select the required number of cards from hand and validate. */
  async playAndValidate() {
    const pick = this.state!.currentQuestion.pick;
    const hand = this.me.hand;
    if (hand.length < pick) {
      throw new Error(`${this.name}: hand has ${hand.length} cards, needs ${pick}`);
    }
    for (let i = 0; i < pick; i++) {
      this.room.send("play-card", { uid: hand[i].uid });
    }
    await this.waitFor(
      () => this.me.selectedCards.length === pick,
      "own selection acknowledged"
    );
    this.room.send("validate-choice");
  }

  /** Vote for the first other player who submitted an answer this round. */
  vote() {
    const target = Object.values(this.state!.players).find(
      (p) => p.id !== this.id && p.selectedCards.length > 0
    )?.id;
    this.room.send("vote-answer", { targetId: target });
  }

  leave(consented = true) {
    return this.room.leave(consented);
  }
}

export async function createGame(
  url: string,
  hostName: string,
  options: { maxRounds?: number } = {}
): Promise<Bot> {
  const client = new Client(url);
  const room = await client.create("bm2q", { playerName: hostName, ...options });
  const bot = new Bot(hostName, room);
  await bot.waitFor((s) => !!s.roomCode, "room code");
  return bot;
}

export async function joinGame(url: string, code: string, name: string): Promise<Bot> {
  const client = new Client(url);
  const room = await client.joinById(code, { playerName: name });
  const bot = new Bot(name, room);
  await bot.waitFor((s) => !!s.players[room.sessionId], "own player in state");
  return bot;
}

/** Host creates a game, others join by code. */
export async function setupGame(
  url: string,
  playerCount: number,
  options: { maxRounds?: number } = {}
): Promise<Bot[]> {
  const host = await createGame(url, "P1", options);
  const bots = [host];
  for (let i = 2; i <= playerCount; i++) {
    bots.push(await joinGame(url, host.state!.roomCode, `P${i}`));
  }
  await host.waitFor(
    (s) => Object.keys(s.players).length === playerCount,
    `${playerCount} players in lobby`
  );
  return bots;
}

/** Play one full round from the "play" phase to the next phase after recap. */
export async function playRound(bots: Bot[]) {
  const active = bots.filter((b) => b.room.connection.isOpen);
  for (const b of active) await b.waitForPhase("play");
  for (const b of active) await b.playAndValidate();
  for (const b of active) await b.waitForPhase("vote");
  for (const b of active) b.vote();
  for (const b of active) await b.waitForPhase("recap");
}

export async function closeAll(bots: Bot[]) {
  await Promise.all(
    bots.map((b) => (b.room.connection.isOpen ? b.leave().catch(() => {}) : undefined))
  );
}
