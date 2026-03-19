import { Room, Client } from "colyseus";
import { randomBytes } from "crypto";
import { nanoid } from "nanoid";
import {
  GameStateSchema,
  PlayerSchema,
  CardSchema,
  QuestionSchema,
} from "../schema/game-state";
import { ArraySchema } from "@colyseus/schema";
import { NB_CARD_IN_HAND, CHANGE_QUOTA } from "../../types/game";

import questionsData from "../data/questions.json";
import answersData from "../data/answers.json";
import congratsData from "../data/congrats.json";

interface Card {
  uid: string;
  text: string;
}

interface Question {
  text: string;
  pick: string | number;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const rand = randomBytes(4).readUInt32BE(0);
    const j = rand % (i + 1);
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
  private answerDeck: Card[] = [];
  private roundVotes = new Map<string, string>(); // voterId -> targetId
  private roundVoteCounts = new Map<string, number>(); // playerId -> vote count
  private goldenCardPicked = false;
  maxClients = 8;

  onCreate(options: { roomCode?: string; firstAt?: number }) {
    this.setState(new GameStateSchema());
    this.state.roomCode = options.roomCode || generateRoomCode();
    this.state.phase = "lobby";

    // Store the target score (validated to allowed values)
    const allowedScores = [5, 10, 15, 20];
    if (options.firstAt && allowedScores.includes(options.firstAt)) {
      this.state.firstAt = options.firstAt;
    }

    // Set room metadata for lookup by code
    this.setMetadata({ roomCode: this.state.roomCode });

    this.registerMessageHandlers();
  }

  private nextAvatarIndex = 0;

  private registerMessageHandlers() {
    this.onMessage("start-game", (client) => {
      if (client.sessionId !== this.state.hostId) return;
      if (this.state.players.size < 2) return;

      this.initializeDecks();

      // Pick congrats message
      const shuffledCongrats = shuffleArray(congratsData as string[]);
      this.state.congrats = shuffledCongrats[0];

      this.transitionToReady();
    });

    this.onMessage("rematch", (client) => {
      if (this.state.phase !== "gameover") return;
      if (client.sessionId !== this.state.hostId) return;

      // Reset all player state
      this.state.players.forEach((player) => {
        player.score = 0;
        player.ready = false;
        player.hasVoted = false;
        player.hasChangedCard = false;
        player.changeQuota = CHANGE_QUOTA;
        player.selectedCards.clear();
        player.hand.clear();
      });

      this.state.nbRound = 0;
      this.state.winnerId = "";
      this.state.roundWinnerIds.clear();
      this.state.goldenCardUid = "";
      this.goldenCardPicked = false;

      this.initializeDecks();

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
      const handCard = player.hand.find((c) => c.uid === uid);
      if (!handCard) return;

      const selectedIndex = player.selectedCards.findIndex(
        (c) => c.uid === uid
      );
      const pick = this.state.currentQuestion.pick;

      if (player.selectedCards.length < pick) {
        if (selectedIndex === -1) {
          const card = new CardSchema();
          card.uid = handCard.uid;
          card.text = handCard.text;
          player.selectedCards.push(card);
        } else {
          player.selectedCards.splice(selectedIndex, 1);
        }
      } else {
        // Already at pick limit, can only deselect
        if (selectedIndex !== -1) {
          player.selectedCards.splice(selectedIndex, 1);
        }
      }
      // Send lightweight update to the acting client only
      client.send("player-update", {
        selectedCards: player.selectedCards.map((c) => ({ uid: c.uid, text: c.text })),
      });
    });

    this.onMessage("change-hand", (client) => {
      if (this.state.phase !== "play") return;
      const player = this.state.players.get(client.sessionId);
      if (!player || player.ready) return;
      if (player.hasChangedCard || player.changeQuota <= 0) return;

      player.hasChangedCard = true;
      player.changeQuota -= 1;
      player.selectedCards.clear();

      // Replace all cards in hand
      player.hand.clear();
      for (let j = 0; j < NB_CARD_IN_HAND; j++) {
        const cardData = this.answerDeck.pop();
        if (cardData) {
          const card = new CardSchema();
          card.uid = cardData.uid;
          card.text = cardData.text;
          player.hand.push(card);
        }
      }
      // If the golden card was in this hand, re-pick from all hands
      if (this.state.goldenCardUid) {
        let goldenExists = false;
        this.state.players.forEach((p) => {
          p.hand.forEach((c) => {
            if (c.uid === this.state.goldenCardUid) goldenExists = true;
          });
        });
        if (!goldenExists) {
          const allUids: string[] = [];
          this.state.players.forEach((p) => {
            p.hand.forEach((c) => allUids.push(c.uid));
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
        hand: player.hand.map((c) => ({ uid: c.uid, text: c.text })),
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
        player.selectedCards.length !== this.state.currentQuestion.pick
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

    // First player is the host
    if (this.state.players.size === 1) {
      this.state.hostId = client.sessionId;
    }

    // Broadcast full state to all clients (so everyone sees the new player)
    this.broadcastSync();
  }

  async onLeave(client: Client, consented: boolean) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    player.connected = false;

    if (this.state.phase === "lobby") {
      // In lobby, just remove the player
      this.state.players.delete(client.sessionId);
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

    try {
      if (!consented) {
        // Allow 60 seconds for reconnection
        await this.allowReconnection(client, 60);
        player.connected = true;
      }
    } catch {
      // Reconnection timed out, mark as disconnected
      // Game continues - other players can still play
    }
  }

  private initializeDecks() {
    // Shuffle questions and convert pick to number
    this.questionDeck = shuffleArray(
      (questionsData as Question[]).map((q) => ({
        text: q.text,
        // Derive pick from the number of blanks in the text
        pick: (q.text.match(/______/g) || []).length || 1,
      }))
    );

    // Create answer cards with unique IDs and shuffle
    this.answerDeck = shuffleArray(
      (answersData as string[]).map((text) => ({
        text,
        uid: nanoid(10),
      }))
    );
  }

  private transitionToReady() {
    if (this.questionDeck.length === 0) {
      this.transitionToGameover();
      return;
    }

    this.state.nbRound += 1;
    this.state.phase = "ready";

    // Pop next question
    const question = this.questionDeck.pop()!;
    this.state.currentQuestion.text = question.text;
    this.state.currentQuestion.pick =
      typeof question.pick === "string"
        ? parseInt(question.pick as string, 10)
        : question.pick;

    // For each player: remove played cards, deal new ones
    this.state.players.forEach((player) => {
      // Remove previously selected cards from hand
      if (player.selectedCards.length > 0) {
        const selectedUids = new Set(
          player.selectedCards.map((c) => c.uid)
        );
        const remainingHand: CardSchema[] = [];
        player.hand.forEach((card) => {
          if (!selectedUids.has(card.uid)) {
            remainingHand.push(card);
          }
        });
        player.hand.clear();
        remainingHand.forEach((card) => player.hand.push(card));
      }

      player.selectedCards.clear();
      player.hasVoted = false;

      // Reset change card if quota remains
      if (player.changeQuota > 0) {
        player.hasChangedCard = false;
      }

      // Fill hand to NB_CARD_IN_HAND
      while (player.hand.length < NB_CARD_IN_HAND) {
        const cardData = this.answerDeck.pop();
        if (!cardData) break;
        const card = new CardSchema();
        card.uid = cardData.uid;
        card.text = cardData.text;
        player.hand.push(card);
      }

      player.ready = true;
    });

    // Pick a golden card once per match (first round only)
    if (!this.goldenCardPicked) {
      this.goldenCardPicked = true;
      const allCardUids: string[] = [];
      this.state.players.forEach((player) => {
        player.hand.forEach((card) => allCardUids.push(card.uid));
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

  private serializePlayer(player: PlayerSchema, forClientId?: string) {
    return {
      id: player.id,
      name: player.name,
      ready: player.ready,
      score: player.score,
      selectedCards: player.selectedCards.map((c) => ({ uid: c.uid, text: c.text })),
      hasChangedCard: player.hasChangedCard,
      changeQuota: player.changeQuota,
      hasVoted: player.hasVoted,
      // Only include hand for the owning player
      hand: forClientId === player.id
        ? player.hand.map((c) => ({ uid: c.uid, text: c.text }))
        : [],
      connected: player.connected,
      avatarIndex: player.avatarIndex,
    };
  }

  private sendSyncToClient(client: Client) {
    const players: Record<string, any> = {};
    this.state.players.forEach((player, id) => {
      players[id] = this.serializePlayer(player, client.sessionId);
    });

    // During play phase and ready phase, hide other players' selected cards
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
      firstAt: this.state.firstAt,
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
    this.state.phase = "play";
    this.state.players.forEach((player) => {
      player.ready = false;
    });
    this.broadcastSync();
  }

  private transitionToVote() {
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
      const player = this.state.players.get(id);
      if (!player) return;

      let playedGolden = false;
      if (this.state.goldenCardUid) {
        player.selectedCards.forEach((card) => {
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
      let hasWinner = false;
      this.state.players.forEach((player) => {
        if (player.score >= this.state.firstAt) hasWinner = true;
      });

      this.roundVoteCounts.clear();

      if (hasWinner) {
        this.transitionToGameover();
      } else {
        this.transitionToReady();
      }
    }, 4000);
  }

  private transitionToGameover() {
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
