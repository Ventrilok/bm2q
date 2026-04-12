import { Schema, type, ArraySchema, MapSchema, filter } from "@colyseus/schema";
import type { Client } from "colyseus";

export class CardSchema extends Schema {
  @type("string") uid: string = "";
  @type("string") text: string = "";
}

export class QuestionSchema extends Schema {
  @type("string") text: string = "";
  @type("number") pick: number = 1;
}

export class PlayerSchema extends Schema {
  @type("string") id: string = "";
  @type("string") name: string = "";
  @type("boolean") ready: boolean = false;
  @type("number") score: number = 0;
  @type("boolean") hasChangedCard: boolean = false;
  @type("number") changeQuota: number = 2;
  @type("boolean") hasVoted: boolean = false;
  @type("boolean") connected: boolean = true;
  @type("number") avatarIndex: number = 0;

  @filter(function (
    this: PlayerSchema,
    client: Client,
    value: ArraySchema<CardSchema>,
    root: GameStateSchema
  ) {
    // Only send hand to the owning player
    return client.sessionId === this.id;
  })
  @type([CardSchema])
  hand = new ArraySchema<CardSchema>();

  @filter(function (
    this: PlayerSchema,
    client: Client,
    value: ArraySchema<CardSchema>,
    root: GameStateSchema
  ) {
    // During play phase, only show to the owning player
    // During vote and after, show to everyone
    const phase = root.phase;
    return phase !== "play" || client.sessionId === this.id;
  })
  @type([CardSchema])
  selectedCards = new ArraySchema<CardSchema>();
}

export class GameStateSchema extends Schema {
  @type("string") phase: string = "lobby";
  @type("number") maxRounds: number = 10;
  @type("number") nbRound: number = 0;
  @type(QuestionSchema) currentQuestion: QuestionSchema = new QuestionSchema();
  @type({ map: PlayerSchema }) players = new MapSchema<PlayerSchema>();
  @type(["string"]) randomizedPlayersOrder = new ArraySchema<string>();
  @type("string") congrats: string = "";
  @type("string") roomCode: string = "";
  @type("string") winnerId: string = "";
  @type("string") hostId: string = "";
  @type(["string"]) roundWinnerIds = new ArraySchema<string>();
  @type("string") goldenCardUid: string = "";
}
