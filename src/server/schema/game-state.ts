import { Schema, type, ArraySchema, MapSchema } from "@colyseus/schema";

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

  // hand and selectedCards are stored in room-level Maps (not on Schema)
  // because @colyseus/schema v2 proxies break array operations even on
  // non-decorated properties.
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
