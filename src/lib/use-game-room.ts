"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Room } from "colyseus.js";
import { getClient } from "./colyseus-client";

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
  firstAt: number;
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
  createRoom: (playerName: string, firstAt?: number) => Promise<void>;
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
    firstAt: data.firstAt || 15,
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
  const roomRef = useRef<Room | null>(null);

  const setupRoom = useCallback((newRoom: Room) => {
    roomRef.current = newRoom;
    setRoom(newRoom);
    setMyId(newRoom.sessionId);

    // Full state sync from server
    newRoom.onMessage("sync-state", (data: any) => {
      setState(parseSyncState(data));
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

    newRoom.onLeave((code) => {
      if (code > 1000) {
        setError("Disconnected from server");
      }
    });
  }, []);

  const createRoom = useCallback(
    async (playerName: string, firstAt?: number) => {
      setError(null);
      setConnecting(true);
      try {
        const client = getClient();
        const newRoom = await client.create("bm2q", { playerName, firstAt });
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
        const rooms = await client.getAvailableRooms("bm2q");
        const target = rooms.find(
          (r) =>
            r.metadata?.roomCode?.toUpperCase() === roomCode.toUpperCase()
        );

        if (!target) {
          setError("Partie introuvable");
          return;
        }

        const newRoom = await client.joinById(target.roomId, {
          playerName,
        });
        setupRoom(newRoom);
      } catch (err: any) {
        console.error("Join room error:", err);
        setError(err.message || "Failed to join room");
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
    roomRef.current?.leave();
    roomRef.current = null;
    setRoom(null);
    setState(null);
    setMyId(null);
  }, []);

  useEffect(() => {
    return () => {
      roomRef.current?.leave();
    };
  }, []);

  return {
    room,
    state,
    myId,
    error,
    connecting,
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
