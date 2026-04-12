import { Room, Client } from "colyseus";
import { randomBytes } from "crypto";
import {
  GameStateSchema,
  PlayerSchema,
  QuestionSchema,
} from "../schema/game-state";

import { NB_CARD_IN_HAND, CHANGE_QUOTA } from "../../types/game";
import { createLogger } from "../logger";

import questionsData from "../data/questions.json";
import answersData from "../data/answers.json";
import congratsData from "../data/congrats.json";

const log = createLogger("BM2QRoom");

const nanoid = (size = 21) => randomBytes(size).toString("base64url").slice(0, size);

interface Card {
  uid: string;
  text: string;
}

interface Question {
  text: string;
  pick: string | number;
}

// Module-level: remembers recently used questions across all room instances in this process.
// Acts as a cross-game exclusion list so new rooms avoid repeating recent questions.
const globalRecentQuestions: string[] = [];
const GLOBAL_RECENT_LIMIT = 150; // Remember ~half the pool across rooms

function recordUsedQuestion(text: string) {
  if (!globalRecentQuestions.includes(text)) {
    globalRecentQuestions.push(text);
    if (globalRecentQuestions.length > GLOBAL_RECENT_LIMIT) {
      globalRecentQuestions.shift();
    }
  }
}

// Mixes crypto-random bytes with a timestamp seed for extra entropy across
// rapid/sequential game starts in the same process.
function shuffleArray<T>(array: T[], tsSeed = 0): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const cryptoRand = randomBytes(4).readUInt32BE(0);
    // XOR with a different slice of the timestamp at each position
    const mixed = (cryptoRand ^ ((tsSeed * (i + 1)) >>> 0)) >>> 0;
    const j = mixed % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export class BM2QRoom extends Room<GameStateSchema> {
  private questionDeck: Question[] = [];
  private usedQuestions: Question[] = [];
  private answerDeck: Card[] = [];
  private roundVotes = new Map<string, string>(); // voterId -> targetId
  private roundVoteCounts = new Map<string, number>(); // playerId -> vote count
  private goldenCardPicked = false;
  maxClients = 8;

  // Hands and selected cards live here — outside Schema — because
  // @colyseus/schema v2 proxies break array operations on Schema objects.
  private playerHands = new Map<string, Card[]>();
  private playerSelected = new Map<string, Card[]>();

  private getHand(id: string): Card[] {
    return this.playerHands.get(id) ?? [];
  }
  private getSelected(id: string): Card[] {
    return this.playerSelected.get(id) ?? [];
  }

  onCreate(options: { roomCode?: string; maxRounds?: number }) {
    this.setState(new GameStateSchema());
    this.state.roomCode = options.roomCode || generateRoomCode();
    this.state.phase = "lobby";

    // Store the max rounds (validated to allowed values)
    const allowedRounds = [5, 10, 15, 20];
    if (options.maxRounds && allowedRounds.includes(options.maxRounds)) {
      this.state.maxRounds = options.maxRounds;
    }

    // Set room metadata for lookup by code
    this.setMetadata({ roomCode: this.state.roomCode });

    log.info(`Room created code=${this.state.roomCode} maxRounds=${this.state.maxRounds}`);
    this.registerMessageHandlers();
  }

  private nextAvatarIndex = 0;

  private registerMessageHandlers() {
    this.onMessage("start-game", (client) => {
      if (client.sessionId !== this.state.hostId) return;
      if (this.state.players.size < 2) return;

      this.initializeDecks();
      log.info(`Game started players=${this.state.players.size} qDeck=${this.questionDeck.length} aDeck=${this.answerDeck.length}`);

      // Pick congrats message
      const shuffledCongrats = shuffleArray(congratsData as string[]);
      this.state.congrats = shuffledCongrats[0];

      this.transitionToReady();
    });

    this.onMessage("rematch", (client) => {
      if (this.state.phase !== "gameover") return;
      if (client.sessionId !== this.state.hostId) return;

      // Reset all player state
      this.state.players.forEach((player, id) => {
        player.score = 0;
        player.ready = false;
        player.hasVoted = false;
        player.hasChangedCard = false;
        player.changeQuota = CHANGE_QUOTA;
        this.playerSelected.set(id, []);
        this.playerHands.set(id, []);
      });

      this.state.nbRound = 0;
      this.state.winnerId = "";
      this.state.roundWinnerIds.clear();
      this.state.goldenCardUid = "";
      this.goldenCardPicked = false;

      this.refillDecksForRematch();

      const shuffledCongrats = shuffleArray(congratsData as string[]);
      this.state.congrats = shuffledCongrats[0];

      this.transitionToReady();
    });

    this.onMessage("player-ready", (client) => {
      if (this.state.phase !== "ready") return;
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      player.ready = true;
      this.checkPhaseAdvance();
    });

    this.onMessage("play-card", (client, data: { uid: string }) => {
      if (this.state.phase !== "play") return;
      const player = this.state.players.get(client.sessionId);
      if (!player || player.ready) return;

      const { uid } = data;
      const hand = this.getHand(client.sessionId);
      const handCard = hand.find((c) => c.uid === uid);
      if (!handCard) return;

      const selected = [...this.getSelected(client.sessionId)];
      const selectedIndex = selected.findIndex((c) => c.uid === uid);
      const pick = this.state.currentQuestion.pick;

      if (selected.length < pick) {
        if (selectedIndex === -1) {
          selected.push({ uid: handCard.uid, text: handCard.text });
        } else {
          selected.splice(selectedIndex, 1);
        }
      } else {
        // Already at pick limit, can only deselect
        if (selectedIndex !== -1) {
          selected.splice(selectedIndex, 1);
        }
      }
      this.playerSelected.set(client.sessionId, selected);

      // Send lightweight update to the acting client only
      client.send("player-update", {
        selectedCards: selected.map((c) => ({ uid: c.uid, text: c.text })),
      });
    });

    this.onMessage("change-hand", (client) => {
      if (this.state.phase !== "play") return;
      const player = this.state.players.get(client.sessionId);
      if (!player || player.ready) return;
      if (player.hasChangedCard || player.changeQuota <= 0) return;

      player.hasChangedCard = true;
      player.changeQuota -= 1;
      this.playerSelected.set(client.sessionId, []);

      // Replace all cards in hand
      const newHand: Card[] = [];
      for (let j = 0; j < NB_CARD_IN_HAND; j++) {
        const cardData = this.answerDeck.pop();
        if (cardData) {
          newHand.push(cardData);
        }
      }
      this.playerHands.set(client.sessionId, newHand);

      // If the golden card was in this hand, re-pick from all hands
      if (this.state.goldenCardUid) {
        let goldenExists = false;
        this.playerHands.forEach((h) => {
          h.forEach((c) => {
            if (c.uid === this.state.goldenCardUid) goldenExists = true;
          });
        });
        if (!goldenExists) {
          const allUids: string[] = [];
          this.playerHands.forEach((h) => {
            h.forEach((c) => allUids.push(c.uid));
          });
          if (allUids.length > 0) {
            const idx = randomBytes(4).readUInt32BE(0) % allUids.length;
            this.state.goldenCardUid = allUids[idx];
          }
          this.broadcastSync();
        }
      }

      // Send lightweight update with new hand
      client.send("player-update", {
        hand: newHand.map((c) => ({ uid: c.uid, text: c.text })),
        selectedCards: [],
        hasChangedCard: player.hasChangedCard,
        changeQuota: player.changeQuota,
      });
    });

    this.onMessage("validate-choice", (client) => {
      if (this.state.phase !== "play") return;
      const player = this.state.players.get(client.sessionId);
      if (!player || player.ready) return;

      // Only validate if correct number of cards selected
      if (
        this.getSelected(client.sessionId).length !== this.state.currentQuestion.pick
      ) {
        return;
      }

      player.ready = true;
      // Broadcast so others see this player is ready
      this.broadcastSync();
      this.checkPhaseAdvance();
    });

    this.onMessage(
      "vote-answer",
      (client, data: { targetId: string }) => {
        if (this.state.phase !== "vote") return;
        const player = this.state.players.get(client.sessionId);
        if (!player || player.hasVoted) return;

        const { targetId } = data;

        // Prevent self-voting
        if (targetId === client.sessionId) return;

        const targetPlayer = this.state.players.get(targetId);
        if (!targetPlayer) return;

        this.roundVotes.set(client.sessionId, targetId);
        player.hasVoted = true;
        player.ready = true;
        this.broadcastSync();
        this.checkPhaseAdvance();
      }
    );

    this.onMessage("vote-pass", (client) => {
      if (this.state.phase !== "vote") return;
      const player = this.state.players.get(client.sessionId);
      if (!player || player.hasVoted) return;

      // Mark as voted but don't record a target — no point awarded
      player.hasVoted = true;
      player.ready = true;
      this.broadcastSync();
      this.checkPhaseAdvance();
    });
  }

  onJoin(client: Client, options: { playerName?: string }) {
    const player = new PlayerSchema();
    player.id = client.sessionId;
    player.name = options.playerName || `Joueur ${this.state.players.size + 1}`;
    player.ready = false;
    player.score = 0;
    player.hasChangedCard = false;
    player.changeQuota = CHANGE_QUOTA;
    player.hasVoted = false;
    player.connected = true;
    player.avatarIndex = this.nextAvatarIndex++;

    this.state.players.set(client.sessionId, player);
    this.playerHands.set(client.sessionId, []);
    this.playerSelected.set(client.sessionId, []);

    // First player is the host
    if (this.state.players.size === 1) {
      this.state.hostId = client.sessionId;
    }

    log.info(`Player joined name="${player.name}" id=${client.sessionId} total=${this.state.players.size}`);
    this.broadcastSync();
  }

  async onLeave(client: Client, consented: boolean) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    log.info(`Player left name="${player.name}" id=${client.sessionId} consented=${consented} phase=${this.state.phase}`);
    player.connected = false;

    if (this.state.phase === "lobby") {
      // In lobby, just remove the player
      this.state.players.delete(client.sessionId);
      this.playerHands.delete(client.sessionId);
      this.playerSelected.delete(client.sessionId);
      // Reassign host if needed
      if (
        client.sessionId === this.state.hostId &&
        this.state.players.size > 0
      ) {
        const firstKey = this.state.players.keys().next().value;
        if (firstKey) this.state.hostId = firstKey;
      }
      this.broadcastSync();
      return;
    }

    // Notify clients of the disconnection and unblock the phase if all
    // remaining connected players have already acted.
    this.broadcastSync();
    this.checkPhaseAdvance();

    try {
      if (!consented) {
        // Allow 60 seconds for reconnection
        await this.allowReconnection(client, 60);
        player.connected = true;
        log.info(`Player reconnected name="${player.name}" id=${client.sessionId}`);
        this.broadcastSync();
      }
    } catch {
      log.warn(`Reconnection timed out for name="${player.name}" id=${client.sessionId}`);
    }
  }

  private initializeDecks() {
    log.debug(`Initializing decks...`);
    const tsSeed = Date.now();
    const recentSet = new Set(globalRecentQuestions);

    const allQuestions = (questionsData as Question[]).map((q) => ({
      text: q.text,
      pick: (q.text.match(/______/g) || []).length || 1,
    }));

    // Fresh questions (not recently seen) go on top of the deck (popped first).
    // Recently seen ones go at the bottom as a fallback if the pool runs dry.
    const freshQuestions = shuffleArray(
      allQuestions.filter((q) => !recentSet.has(q.text)),
      tsSeed
    );
    const staleQuestions = shuffleArray(
      allQuestions.filter((q) => recentSet.has(q.text)),
      tsSeed
    );
    this.questionDeck = [...staleQuestions, ...freshQuestions];
    this.usedQuestions = [];

    // Create answer cards with unique IDs and shuffle
    this.answerDeck = shuffleArray(
      (answersData as string[]).map((text) => ({
        text,
        uid: nanoid(10),
      })),
      tsSeed
    );
    log.info(`Decks initialized questions=${this.questionDeck.length} (fresh=${freshQuestions.length} stale=${staleQuestions.length}) answers=${this.answerDeck.length}`);
  }

  private refillDecksForRematch() {
    // For questions: continue from existing deck; only refill when running low
    if (this.questionDeck.length < this.state.maxRounds) {
      const tsSeed = Date.now();
      const recentSet = new Set(globalRecentQuestions);

      const available = [...this.questionDeck, ...this.usedQuestions];
      const fresh = shuffleArray(available.filter((q) => !recentSet.has(q.text)), tsSeed);
      const stale = shuffleArray(available.filter((q) => recentSet.has(q.text)), tsSeed);
      this.questionDeck = [...stale, ...fresh];
      this.usedQuestions = [];
    }

    // For answers: continue from existing deck; refill only when running low
    const neededAnswers = NB_CARD_IN_HAND * this.state.players.size * 3;
    if (this.answerDeck.length < neededAnswers) {
      // Add back all answer texts not already waiting in the deck (fresh UIDs)
      const inDeckTexts = new Set(this.answerDeck.map((c) => c.text));
      const freshCards = shuffleArray(
        (answersData as string[])
          .filter((text) => !inDeckTexts.has(text))
          .map((text) => ({ text, uid: nanoid(10) }))
      );
      this.answerDeck = [...this.answerDeck, ...freshCards];
    }
  }

  private transitionToReady() {
    if (this.questionDeck.length === 0) {
      this.transitionToGameover();
      return;
    }

    this.state.nbRound += 1;
    this.state.phase = "ready";

    // Pop next question and track it as used (both locally and globally)
    const question = this.questionDeck.pop();
    if (!question) {
      log.error(`Question deck empty after length check — should not happen`);
      this.transitionToGameover();
      return;
    }
    this.usedQuestions.push(question);
    recordUsedQuestion(question.text);
    log.info(`Round ${this.state.nbRound} question="${question.text.slice(0, 60)}..." pick=${question.pick} qDeckLeft=${this.questionDeck.length}`);
    this.state.currentQuestion.text = question.text;
    this.state.currentQuestion.pick =
      typeof question.pick === "string"
        ? parseInt(question.pick as string, 10)
        : question.pick;

    // For each player: remove played cards, deal new ones
    this.state.players.forEach((player, id) => {
      // Remove previously selected cards from hand
      const selected = this.getSelected(id);
      let hand = this.getHand(id);
      if (selected.length > 0) {
        const selectedUids = new Set(selected.map((c) => c.uid));
        hand = hand.filter((card) => !selectedUids.has(card.uid));
      }

      this.playerSelected.set(id, []);
      player.hasVoted = false;

      // Reset change card if quota remains
      if (player.changeQuota > 0) {
        player.hasChangedCard = false;
      }

      // Fill hand to NB_CARD_IN_HAND
      while (hand.length < NB_CARD_IN_HAND) {
        const cardData = this.answerDeck.pop();
        if (!cardData) break;
        hand.push(cardData);
      }
      this.playerHands.set(id, hand);
      log.debug(`Dealt cards player="${player.name}" hand=${hand.length} aDeckLeft=${this.answerDeck.length}`);

      player.ready = true;
    });

    // Pick a golden card once per match (first round only)
    if (!this.goldenCardPicked) {
      this.goldenCardPicked = true;
      const allCardUids: string[] = [];
      this.playerHands.forEach((hand) => {
        hand.forEach((card) => allCardUids.push(card.uid));
      });
      if (allCardUids.length > 0) {
        const randIndex = randomBytes(4).readUInt32BE(0) % allCardUids.length;
        this.state.goldenCardUid = allCardUids[randIndex];
      }
    }

    this.broadcastSync();

    // Auto-advance to play after a short delay (let clients see the question)
    this.clock.setTimeout(() => {
      this.transitionToPlay();
    }, 1500);
  }

  private serializePlayer(playerId: string, player: PlayerSchema, forClientId?: string) {
    const hand = this.getHand(playerId);
    const selected = this.getSelected(playerId);
    return {
      id: player.id,
      name: player.name,
      ready: player.ready,
      score: player.score,
      selectedCards: selected.map((c) => ({ uid: c.uid, text: c.text })),
      hasChangedCard: player.hasChangedCard,
      changeQuota: player.changeQuota,
      hasVoted: player.hasVoted,
      // Only include hand for the owning player
      hand: forClientId === playerId
        ? hand.map((c) => ({ uid: c.uid, text: c.text }))
        : [],
      connected: player.connected,
      avatarIndex: player.avatarIndex,
    };
  }

  private sendSyncToClient(client: Client) {
    const players: Record<string, any> = {};
    this.state.players.forEach((player, id) => {
      players[id] = this.serializePlayer(id, player, client.sessionId);
    });

    // During play phase, hide other players' selected cards
    if (this.state.phase === "play") {
      for (const id of Object.keys(players)) {
        if (id !== client.sessionId) {
          players[id].selectedCards = [];
        }
      }
    }

    const randomizedPlayersOrder: string[] = [];
    this.state.randomizedPlayersOrder.forEach((id) => randomizedPlayersOrder.push(id));

    client.send("sync-state", {
      roomCode: this.state.roomCode,
      phase: this.state.phase,
      hostId: this.state.hostId,
      maxRounds: this.state.maxRounds,
      nbRound: this.state.nbRound,
      congrats: this.state.congrats,
      winnerId: this.state.winnerId,
      roundWinnerIds: (() => { const ids: string[] = []; this.state.roundWinnerIds.forEach((id) => ids.push(id)); return ids; })(),
      roundVoteCounts: Object.fromEntries(this.roundVoteCounts),
      goldenCardUid: this.state.goldenCardUid,
      currentQuestion: {
        text: this.state.currentQuestion.text,
        pick: this.state.currentQuestion.pick,
      },
      players,
      randomizedPlayersOrder,
    });
  }

  private broadcastSync() {
    this.clients.forEach((client) => {
      this.sendSyncToClient(client);
    });
  }

  private transitionToPlay() {
    log.info(`Phase -> play round=${this.state.nbRound}`);
    this.state.phase = "play";
    this.state.players.forEach((player) => {
      player.ready = false;
    });
    this.broadcastSync();
  }

  private transitionToVote() {
    log.info(`Phase -> vote round=${this.state.nbRound}`);
    this.state.phase = "vote";

    // Randomize player order for display
    const playerIds = Array.from(this.state.players.keys());
    const shuffled = shuffleArray(playerIds);
    this.state.randomizedPlayersOrder.clear();
    shuffled.forEach((id) =>
      this.state.randomizedPlayersOrder.push(id)
    );

    this.state.players.forEach((player) => {
      player.ready = false;
      player.hasVoted = false;
    });
    this.broadcastSync();
  }

  private transitionToRecap() {
    log.info(`Phase -> recap round=${this.state.nbRound} votes=${this.roundVotes.size}`);
    // Tally votes per player
    const voteCounts = new Map<string, number>();
    this.state.players.forEach((_, id) => voteCounts.set(id, 0));

    this.roundVotes.forEach((targetId) => {
      voteCounts.set(targetId, (voteCounts.get(targetId) || 0) + 1);
    });

    // Find max vote count
    let maxVotes = 0;
    voteCounts.forEach((count) => {
      if (count > maxVotes) maxVotes = count;
    });

    // All players tied at max votes are round winners (only if they got at least 1 vote)
    this.state.roundWinnerIds.clear();
    if (maxVotes > 0) {
      voteCounts.forEach((count, id) => {
        if (count === maxVotes) {
          this.state.roundWinnerIds.push(id);
        }
      });
    }

    // Award points to each winner
    const winnerIdSet = new Set<string>();
    this.state.roundWinnerIds.forEach((id) => winnerIdSet.add(id));

    winnerIdSet.forEach((id) => {
      const selected = this.getSelected(id);
      const player = this.state.players.get(id);
      if (!player) return;

      let playedGolden = false;
      if (this.state.goldenCardUid) {
        selected.forEach((card) => {
          if (card.uid === this.state.goldenCardUid) playedGolden = true;
        });
      }
      player.score += playedGolden ? 2 : 1;
    });

    // Store vote counts for client display
    this.roundVoteCounts = voteCounts;

    this.state.phase = "recap";
    this.broadcastSync();

    // Clear round votes
    this.roundVotes.clear();

    // Auto-advance after 4 seconds
    this.clock.setTimeout(() => {
      this.roundVoteCounts.clear();

      if (this.state.nbRound >= this.state.maxRounds) {
        this.transitionToGameover();
      } else {
        this.transitionToReady();
      }
    }, 4000);
  }

  private transitionToGameover() {
    log.info(`Phase -> gameover after ${this.state.nbRound} rounds`);
    this.state.phase = "gameover";

    // Find winner
    let maxScore = 0;
    let winnerId = "";
    this.state.players.forEach((player, id) => {
      if (player.score > maxScore) {
        maxScore = player.score;
        winnerId = id;
      }
    });

    this.state.winnerId = winnerId;
    this.broadcastSync();
  }

  private checkPhaseAdvance() {
    if (!this.allPlayersReady()) return;

    switch (this.state.phase) {
      case "ready":
        this.transitionToPlay();
        break;
      case "play":
        this.transitionToVote();
        break;
      case "vote":
        this.transitionToRecap();
        break;
    }
  }

  private allPlayersReady(): boolean {
    let allReady = true;
    this.state.players.forEach((player) => {
      if (player.connected && !player.ready) {
        allReady = false;
      }
    });
    return allReady;
  }
}
