"use client";

import { useState, useEffect, Suspense, lazy } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useGameRoom } from "@/lib/use-game-room";
import { getAvatar } from "@/lib/avatars";

const GameBoard = lazy(() =>
  import("@/components/game/board").then((m) => ({ default: m.GameBoard }))
);

function LobbyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const playerName = searchParams.get("name") || "Joueur";

  const {
    state,
    myId,
    error,
    connecting,
    createRoom,
    joinRoom,
    startGame,
    leaveRoom,
    playCard,
    changeHand,
    validateChoice,
    voteAnswer,
    votePass,
    playerReady,
    rematch,
  } = useGameRoom();

  const [roomCode, setRoomCode] = useState(["", "", "", ""]);
  const [mode, setMode] = useState<"choose" | "lobby">("choose");
  const [firstAt, setFirstAt] = useState(15);

  // Navigate to game when phase changes from lobby
  const isInGame =
    state &&
    state.phase !== "lobby";

  const handleCreate = async () => {
    await createRoom(playerName, firstAt);
  };

  const handleJoin = async () => {
    const code = roomCode.join("");
    if (code.length === 4) {
      await joinRoom(code, playerName);
    }
  };

  // Switch to lobby view when we have a room with a code
  const inLobbyRoom = state && state.phase === "lobby" && state.roomCode;
  const effectiveMode = inLobbyRoom ? "lobby" : mode;

  const handleCodeInput = (index: number, value: string) => {
    const char = value.toUpperCase().replace(/[^A-Z]/g, "");
    const newCode = [...roomCode];
    newCode[index] = char;
    setRoomCode(newCode);

    // Auto-focus next input
    if (char && index < 3) {
      const next = document.getElementById(`code-${index + 1}`);
      next?.focus();
    }
  };

  const handleCodeKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !roomCode[index] && index > 0) {
      const prev = document.getElementById(`code-${index - 1}`);
      prev?.focus();
    }
    if (e.key === "Enter") {
      handleJoin();
    }
  };

  const handleLeave = () => {
    leaveRoom();
    setMode("choose");
    setRoomCode(["", "", "", ""]);
  };

  // If in game, render the game board (lazy loaded)
  if (isInGame && state && myId) {
    return (
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center">
            <p className="font-game text-xl text-white">Chargement...</p>
          </div>
        }
      >
        <GameBoard
          state={state}
          myId={myId}
          onPlayCard={playCard}
          onChangeHand={changeHand}
          onValidateChoice={validateChoice}
          onVoteAnswer={voteAnswer}
          onVotePass={votePass}
          onPlayerReady={playerReady}
          onLeave={handleLeave}
          onRematch={rematch}
        />
      </Suspense>
    );
  }

  // Choose mode: create or join
  if (effectiveMode === "choose") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <h1 className="font-game text-3xl text-white">
            BM<span className="text-[var(--yellow)]">2</span>Q
          </h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Salut {playerName} !
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full max-w-sm"
        >
          {/* Join section */}
          <div className="mb-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
            <p className="mb-4 text-center font-game text-lg text-white">
              Entre le code
            </p>
            <div className="mb-4 flex justify-center gap-3">
              {roomCode.map((char, i) => (
                <input
                  key={i}
                  id={`code-${i}`}
                  type="text"
                  maxLength={1}
                  value={char}
                  onChange={(e) => handleCodeInput(i, e.target.value)}
                  onKeyDown={(e) => handleCodeKeyDown(i, e)}
                  className="h-16 w-14 rounded-xl border-2 border-[var(--border)] bg-[var(--surface-2)] text-center text-2xl font-extrabold uppercase text-[var(--yellow)] outline-none transition-colors focus:border-[var(--accent)]"
                  placeholder="·"
                />
              ))}
            </div>
            <button
              onClick={handleJoin}
              disabled={
                roomCode.join("").length !== 4 || connecting
              }
              className="w-full rounded-xl bg-[var(--accent)] px-6 py-3 text-base font-semibold text-white transition-all hover:bg-[var(--accent-dim)] disabled:opacity-50"
            >
              {connecting ? "Connexion..." : "Rejoindre"}
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-4 text-center text-sm text-[var(--text-muted)]">
            <span className="relative z-10 bg-[var(--bg)] px-4">ou</span>
            <div className="absolute left-0 right-0 top-1/2 h-px bg-[var(--border)]" />
          </div>

          {/* Create */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
            <p className="mb-3 text-center font-game text-lg text-white">
              Objectif
            </p>
            <div className="mb-4 flex justify-center gap-2">
              {[5, 10, 15, 20].map((n) => (
                <button
                  key={n}
                  onClick={() => setFirstAt(n)}
                  className={`rounded-lg px-4 py-2 text-sm font-bold transition-all ${
                    firstAt === n
                      ? "bg-[var(--accent)] text-white"
                      : "border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] hover:border-[var(--accent)]"
                  }`}
                >
                  {n} pts
                </button>
              ))}
            </div>
            <button
              onClick={handleCreate}
              disabled={connecting}
              className="w-full rounded-xl border border-[var(--border)] px-6 py-3 text-base font-semibold text-[var(--text-muted)] transition-all hover:border-[var(--accent)] hover:text-white disabled:opacity-50"
            >
              {connecting ? "Création..." : "Créer une partie"}
            </button>
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 text-center text-sm text-[var(--red)]"
            >
              {error}
            </motion.p>
          )}
        </motion.div>

        <button
          onClick={() => router.push("/")}
          className="mt-8 text-sm text-[var(--text-muted)] transition-colors hover:text-white"
        >
          Retour
        </button>
      </div>
    );
  }

  // Lobby mode: waiting for players
  const players = state ? Array.from(state.players.entries()) : [];
  const isHost = myId === state?.hostId;
  // Avatar colors now come from the shared avatars utility

  return (
    <div className="flex min-h-screen flex-col px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-game text-2xl text-white">Salon</h2>
        <button
          onClick={handleLeave}
          className="rounded-lg border border-[var(--red)]/30 px-4 py-2 text-sm text-[var(--red)] transition-colors hover:bg-[var(--red)]/10"
        >
          Quitter
        </button>
      </div>

      {/* Room code */}
      <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
        <p className="text-xs uppercase tracking-[2px] text-[var(--text-muted)]">
          Code de la partie
        </p>
        <p className="mt-3 text-5xl font-extrabold tracking-[12px] text-[var(--yellow)]"
          style={{ textShadow: "0 0 30px rgba(251,191,36,0.3)" }}
        >
          {state?.roomCode || "..."}
        </p>
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          Partage ce code avec tes amis
        </p>
      </div>

      {/* Players */}
      <div className="mt-6">
        <h3 className="mb-3 text-xs uppercase tracking-wider text-[var(--text-muted)]">
          Joueurs ({players.length}/8)
        </h3>
        <div className="flex flex-col gap-2">
          <AnimatePresence>
            {players.map(([id, player]) => {
              const avatar = getAvatar(player.avatarIndex);
              return (
              <motion.div
                key={id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
              >
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm ${avatar.color}`}
                >
                  {avatar.emoji}
                </div>
                <span className="text-base font-medium">{player.name}</span>
                {id === state?.hostId && (
                  <span className="ml-auto rounded bg-[var(--accent)]/15 px-2 py-0.5 text-xs text-[var(--accent)]">
                    Hôte
                  </span>
                )}
                {id !== state?.hostId && (
                  <div className="ml-auto h-2 w-2 animate-pulse rounded-full bg-[var(--green)]" />
                )}
              </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Start button */}
      <div className="mt-auto pt-6">
        {isHost ? (
          <button
            onClick={startGame}
            disabled={players.length < 2}
            className="w-full rounded-xl bg-[var(--accent)] px-6 py-3.5 text-base font-semibold text-white transition-all hover:bg-[var(--accent-dim)] disabled:opacity-50"
          >
            Lancer la partie
          </button>
        ) : (
          <p className="text-center text-sm text-[var(--text-muted)]">
            En attente du lancement par l&apos;hôte...
          </p>
        )}
      </div>

      {error && (
        <p className="mt-4 text-center text-sm text-[var(--red)]">{error}</p>
      )}
    </div>
  );
}

export default function LobbyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-[var(--text-muted)]">Chargement...</p>
        </div>
      }
    >
      <LobbyContent />
    </Suspense>
  );
}
