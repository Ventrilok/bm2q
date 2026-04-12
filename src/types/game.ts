export interface Card {
  uid: string;
  text: string;
}

export interface Question {
  text: string;
  pick: number;
}

export enum GamePhase {
  LOBBY = "lobby",
  READY = "ready",
  PLAY = "play",
  VOTE = "vote",
  RECAP = "recap",
  GAMEOVER = "gameover",
}

export interface PlayerState {
  id: string;
  name: string;
  ready: boolean;
  score: number;
  selectedCards: Card[];
  hasChangedCard: boolean;
  changeQuota: number;
  hasVoted: boolean;
  hand: Card[];
  connected: boolean;
  avatarIndex: number;
}

export interface GameState {
  phase: GamePhase;
  maxRounds: number;
  nbRound: number;
  currentQuestion: Question | null;
  players: Map<string, PlayerState>;
  randomizedPlayersOrder: string[];
  congrats: string;
  roomCode: string;
  winnerId: string | null;
  roundWinnerIds: string[];
  roundVoteCounts: Record<string, number>;
  goldenCardUid: string;
}

export const NB_CARD_IN_HAND = 8;
export const DEFAULT_MAX_ROUNDS = 10;
export const CHANGE_QUOTA = 2;
