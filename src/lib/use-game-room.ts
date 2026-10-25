"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { CloseCode, type Room } from "@colyseus/sdk";
import { getClient } from "./colyseus-client";

export const SEAT_EXPIRED_MESSAGE = "Ta place dans la partie a expiré";

// The seat survives a page refresh: the reconnection token is kept for this
// browser tab only. It changes on every reconnection, so it is re-saved on
// each state sync.
const SESSION_KEY = "bm2q:reconnection-token";

function saveToken(token: string | undefined) {
  try {
    if (token) sessionStorage.setItem(SESSION_KEY, token);
  } catch {}
}
function loadToken(): string | null {
  try {
    return sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}
function clearToken() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {}
}

// Automatic reconnection after a network drop or a locked phone: retry for
// about 3 minutes, the time the server keeps the seat.
function configureReconnection(room: Room) {
  room.reconnection.maxRetries = 40;
  room.reconnection.minUptime = 1000;
}

export interface CardState {
  uid: string;
  text: string;
}

export interface PlayerState {
  id: string;
  name: string;
  ready: boolean;
  score: number;
  selectedCards: CardState[];
  hasChangedCard: boolean;
  changeQuota: number;
  hasVoted: boolean;
  hand: CardState[];
  connected: boolean;
  avatarIndex: number;
}

export interface QuestionState {
  text: string;
  pick: number;
}

export interface GameRoomState {
  phase: string;
  maxRounds: number;
  nbRound: number;
  currentQuestion: QuestionState;
  players: Map<string, PlayerState>;
  randomizedPlayersOrder: string[];
  congrats: string;
  roomCode: string;
  winnerId: string;
  hostId: string;
  roundWinnerIds: string[];
  roundVoteCounts: Record<string, number>;
  goldenCardUid: string;
}

interface UseGameRoomReturn {
  room: Room | null;
  state: GameRoomState | null;
  myId: string | null;
  error: string | null;
  connecting: boolean;
  /** The connection dropped and the client is trying to get the seat back. */
  connectionLost: boolean;
  /** A previous seat is being restored after a page load. */
  restoring: boolean;
  createRoom: (playerName: string, maxRounds?: number) => Promise<void>;
  joinRoom: (roomCode: string, playerName: string) => Promise<void>;
  startGame: () => void;
  playCard: (uid: string) => void;
  changeHand: () => void;
  validateChoice: () => void;
  voteAnswer: (targetId: string) => void;
  votePass: () => void;
  playerReady: () => void;
  leaveRoom: () => void;
  rematch: () => void;
}

export function joinErrorMessage(serverMessage?: string): string {
  const msg = serverMessage || "";
  if (msg.includes("GAME_STARTED")) return "Partie déjà commencée";
  if (msg.includes("is locked")) return "Partie complète";
  if (msg.includes("not found") || msg.includes("disposed")) return "Partie introuvable";
  return "Impossible de rejoindre la partie";
}

function parseSyncState(data: any): GameRoomState {
  const players = new Map<string, PlayerState>();
  if (data.players) {
    for (const [key, p] of Object.entries(data.players) as [string, any][]) {
      players.set(key, {
        id: p.id,
        name: p.name,
        ready: p.ready,
        score: p.score,
        selectedCards: p.selectedCards || [],
        hasChangedCard: p.hasChangedCard,
        changeQuota: p.changeQuota,
        hasVoted: p.hasVoted,
        hand: p.hand || [],
        connected: p.connected,
        avatarIndex: p.avatarIndex ?? 0,
      });
    }
  }

  return {
    phase: data.phase || "lobby",
    maxRounds: data.maxRounds || 10,
    nbRound: data.nbRound || 0,
    currentQuestion: {
      text: data.currentQuestion?.text || "",
      pick: data.currentQuestion?.pick || 1,
    },
    players,
    randomizedPlayersOrder: data.randomizedPlayersOrder || [],
    congrats: data.congrats || "",
    roomCode: data.roomCode || "",
    winnerId: data.winnerId || "",
    hostId: data.hostId || "",
    roundWinnerIds: data.roundWinnerIds || [],
    roundVoteCounts: data.roundVoteCounts || {},
    goldenCardUid: data.goldenCardUid || "",
  };
}

export function useGameRoom(): UseGameRoomReturn {
  const [room, setRoom] = useState<Room | null>(null);
  const [state, setState] = useState<GameRoomState | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectionLost, setConnectionLost] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const roomRef = useRef<Room | null>(null);
  const restoreAttempted = useRef(false);

  const resetRoom = useCallback(() => {
    roomRef.current = null;
    setRoom(null);
    setState(null);
    setMyId(null);
    setConnectionLost(false);
  }, []);

  const setupRoom = useCallback((newRoom: Room) => {
    roomRef.current = newRoom;
    configureReconnection(newRoom);
    setRoom(newRoom);
    setMyId(newRoom.sessionId);
    setConnectionLost(false);
    saveToken(newRoom.reconnectionToken);

    // Full state sync from server
    newRoom.onMessage("sync-state", (data: any) => {
      setState(parseSyncState(data));
      saveToken(newRoom.reconnectionToken);
    });

    // Lightweight partial update for own player (play-card, change-hand)
    newRoom.onMessage("player-update", (data: any) => {
      setState((prev) => {
        if (!prev) return prev;
        const myPlayer = prev.players.get(newRoom.sessionId);
        if (!myPlayer) return prev;

        const updated = { ...myPlayer, ...data };
        const newPlayers = new Map(prev.players);
        newPlayers.set(newRoom.sessionId, updated);
        return { ...prev, players: newPlayers };
      });
    });

    newRoom.onError((code, message) => {
      console.error("Room error:", code, message);
      setError(message || `Error ${code}`);
    });

    newRoom.onDrop(() => setConnectionLost(true));
    newRoom.onReconnect(() => setConnectionLost(false));

    newRoom.onLeave((code) => {
      if (roomRef.current !== newRoom) return; // already left on purpose
      if (code === CloseCode.CONSENTED) return;
      // Reconnection gave up, or the server no longer holds the seat.
      clearToken();
      resetRoom();
      setError(SEAT_EXPIRED_MESSAGE);
    });
  }, [resetRoom]);

  // After a page refresh, take the previous seat back if there is one.
  useEffect(() => {
    if (restoreAttempted.current) return;
    restoreAttempted.current = true;
    const token = loadToken();
    if (!token) return;
    setRestoring(true);
    getClient()
      .reconnect(token)
      .then((restored) => setupRoom(restored))
      .catch(() => {
        clearToken();
        setError(SEAT_EXPIRED_MESSAGE);
      })
      .finally(() => setRestoring(false));
  }, [setupRoom]);

  const createRoom = useCallback(
    async (playerName: string, maxRounds?: number) => {
      setError(null);
      setConnecting(true);
      try {
        const client = getClient();
        const newRoom = await client.create("bm2q", { playerName, maxRounds });
        setupRoom(newRoom);
      } catch (err: any) {
        console.error("Create room error:", err);
        setError(err.message || "Failed to create room");
      } finally {
        setConnecting(false);
      }
    },
    [setupRoom]
  );

  const joinRoom = useCallback(
    async (roomCode: string, playerName: string) => {
      setError(null);
      setConnecting(true);
      try {
        const client = getClient();
        // The room code is the room id: the server looks it up directly.
        const newRoom = await client.joinById(roomCode.toUpperCase(), {
          playerName,
        });
        setupRoom(newRoom);
      } catch (err: any) {
        console.error("Join room error:", err);
        setError(joinErrorMessage(err?.message));
      } finally {
        setConnecting(false);
      }
    },
    [setupRoom]
  );

  const startGame = useCallback(() => {
    roomRef.current?.send("start-game");
  }, []);

  const playCard = useCallback((uid: string) => {
    roomRef.current?.send("play-card", { uid });
  }, []);

  const changeHand = useCallback(() => {
    roomRef.current?.send("change-hand");
  }, []);

  const validateChoice = useCallback(() => {
    roomRef.current?.send("validate-choice");
  }, []);

  const voteAnswer = useCallback((targetId: string) => {
    roomRef.current?.send("vote-answer", { targetId });
  }, []);

  const votePass = useCallback(() => {
    roomRef.current?.send("vote-pass");
  }, []);

  const playerReady = useCallback(() => {
    roomRef.current?.send("player-ready");
  }, []);

  const rematch = useCallback(() => {
    roomRef.current?.send("rematch");
  }, []);

  const leaveRoom = useCallback(() => {
    const current = roomRef.current;
    clearToken();
    resetRoom();
    current?.leave();
  }, [resetRoom]);

  // Leaving the page within the app (not a refresh) gives the seat up.
  useEffect(() => {
    return () => {
      if (!roomRef.current) return;
      clearToken();
      roomRef.current.leave();
    };
  }, []);

  return {
    room,
    state,
    myId,
    error,
    connecting,
    connectionLost,
    restoring,
    createRoom,
    joinRoom,
    startGame,
    playCard,
    changeHand,
    validateChoice,
    voteAnswer,
    votePass,
    playerReady,
    leaveRoom,
    rematch,
  };
}
