"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { GameRoomState } from "@/lib/use-game-room";
import { QuestionCard } from "./question-card";
import { AnswerCard } from "./answer-card";
import { VoteCard } from "./vote-card";
import { Leaderboard } from "./leaderboard";

interface GameBoardProps {
  state: GameRoomState;
  myId: string;
  onPlayCard: (uid: string) => void;
  onChangeHand: () => void;
  onValidateChoice: () => void;
  onVoteAnswer: (targetId: string) => void;
  onVotePass: () => void;
  onPlayerReady: () => void;
  onLeave: () => void;
  onRematch: () => void;
}

export function GameBoard({
  state,
  myId,
  onPlayCard,
  onChangeHand,
  onValidateChoice,
  onVoteAnswer,
  onVotePass,
  onPlayerReady,
  onLeave,
  onRematch,
}: GameBoardProps) {
  const [selectedVoteId, setSelectedVoteId] = useState<string | null>(null);

  const me = state.players.get(myId);
  if (!me) return null;

  const isPlay = state.phase === "play";
  const isVote = state.phase === "vote";
  const isRecap = state.phase === "recap";
  const isGameover = state.phase === "gameover";
  const isReady = state.phase === "ready";
  const isHost = myId === state.hostId;

  const readyToValidate =
    me.selectedCards.length === state.currentQuestion.pick;

  const handleVote = (targetId: string) => {
    if (me.hasVoted || targetId === myId) return;
    setSelectedVoteId(targetId);
    onVoteAnswer(targetId);
  };

  // Game over text
  let gameoverText = "";
  if (isGameover && state.winnerId) {
    const winner = state.players.get(state.winnerId);
    gameoverText = state.congrats.replace(
      "______",
      winner?.name || "???"
    );
  }

  // Sort players by score for gameover
  const sortedPlayers = Array.from(state.players.entries()).sort(
    ([, a], [, b]) => b.score - a.score
  );

  // Vote order — include self but mark as non-votable
  const votePlayerOrder = state.randomizedPlayersOrder
    .map((id) => ({
      id,
      player: state.players.get(id),
      isMine: id === myId,
    }))
    .filter((p) => p.player);

  const [showQuitConfirm, setShowQuitConfirm] = useState(false);

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Quit confirmation overlay */}
      {showQuitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mx-4 w-full max-w-xs rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center"
          >
            <p className="font-game text-lg text-white">Quitter la partie ?</p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Tu ne pourras pas revenir.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setShowQuitConfirm(false)}
                className="flex-1 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition-colors hover:bg-[var(--surface-2)]"
              >
                Annuler
              </button>
              <button
                onClick={onLeave}
                className="flex-1 rounded-xl bg-[var(--red)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-600"
              >
                Quitter
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Top bar */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3 safe-top">
        <button
          onClick={() => setShowQuitConfirm(true)}
          className="mr-1 rounded-md px-2 py-1 text-xs text-[var(--red)] transition-colors hover:bg-[var(--red)]/10"
        >
          ✕
        </button>
        <span className="rounded-md bg-[var(--surface-2)] px-2.5 py-1 text-xs font-semibold text-[var(--text-muted)]">
          Manche {state.nbRound}
        </span>
        <span className="text-xs text-[var(--text-muted)]">
          / {state.maxRounds}
        </span>
        {isPlay && (
          <span className="ml-auto rounded-md bg-blue-500/15 px-2.5 py-1 text-xs font-semibold text-[var(--blue)]">
            Choisis tes cartes
          </span>
        )}
        {isVote && (
          <span className="ml-auto rounded-md bg-yellow-500/15 px-2.5 py-1 text-xs font-semibold text-[var(--yellow)]">
            Vote pour la meilleure
          </span>
        )}
        {isRecap && (
          <span className="ml-auto rounded-md bg-yellow-500/15 px-2.5 py-1 text-xs font-semibold text-[var(--yellow)]">
            Résultat du vote
          </span>
        )}
        {isReady && (
          <span className="ml-auto rounded-md bg-green-500/15 px-2.5 py-1 text-xs font-semibold text-[var(--green)]">
            Nouvelle manche...
          </span>
        )}
      </div>

      {/* Scores */}
      <Leaderboard players={state.players} myId={myId} />

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        <AnimatePresence mode="wait">
          {/* PLAY PHASE */}
          {isPlay && (
            <motion.div
              key="play"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-1 flex-col"
            >
              {/* Question */}
              <div className="flex justify-center px-4 py-4">
                <QuestionCard
                  text={state.currentQuestion.text}
                  pick={state.currentQuestion.pick}
                />
              </div>

              {/* Hand */}
              <div className="px-3 pb-48 safe-bottom">
                <div className="mx-auto grid max-w-4xl grid-cols-2 gap-2.5 min-[480px]:grid-cols-3 md:grid-cols-4 lg:max-w-5xl lg:gap-3">
                  {me.hand.map((card, index) => {
                    const selectedIndex = me.selectedCards.findIndex(
                      (sc) => sc.uid === card.uid
                    );
                    return (
                      <AnswerCard
                        key={card.uid}
                        text={card.text}
                        index={index}
                        selected={selectedIndex !== -1}
                        selectedPosition={selectedIndex + 1}
                        disabled={me.ready}
                        isGolden={card.uid === state.goldenCardUid}
                        onClick={() => onPlayCard(card.uid)}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Bottom bar */}
              {!me.ready && (
                <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--border)] bg-[var(--surface)] px-4 py-3 safe-bottom">
                  <div className="mx-auto flex max-w-xl gap-3">
                    <button
                      onClick={onChangeHand}
                      disabled={me.hasChangedCard || me.changeQuota <= 0}
                      className="flex flex-1 flex-col items-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition-all hover:border-[var(--accent)] disabled:opacity-40"
                    >
                      Changer
                      <span className="text-[10px] text-[var(--text-muted)]">
                        ({me.changeQuota} restant{me.changeQuota > 1 ? "s" : ""})
                      </span>
                    </button>
                    <button
                      onClick={onValidateChoice}
                      disabled={!readyToValidate}
                      className="flex-1 rounded-xl bg-[var(--green-dim)] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[var(--green)] disabled:opacity-40"
                    >
                      Valider
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* VOTE PHASE */}
          {isVote && (
            <motion.div
              key="vote"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-1 flex-col"
            >
              {/* Question reminder */}
              <div className="flex justify-center px-4 py-3">
                <QuestionCard
                  text={state.currentQuestion.text}
                  pick={state.currentQuestion.pick}
                  compact
                />
              </div>

              {/* Votable cards (others only) + pass */}
              <div className="px-4 pb-44 safe-bottom">
                <div className="mx-auto grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2 lg:max-w-5xl lg:grid-cols-3">
                  {votePlayerOrder
                    .filter((p) => !p.isMine)
                    .map(({ id, player }, index) => {
                      const hasGolden = player!.selectedCards.some(
                        (c) => c.uid === state.goldenCardUid
                      );
                      return (
                        <VoteCard
                          key={id}
                          questionText={state.currentQuestion.text}
                          answers={player!.selectedCards}
                          authorName={player!.name}
                          authorAvatarIndex={player!.avatarIndex}
                          showAuthor={me.hasVoted}
                          selected={selectedVoteId === id}
                          disabled={me.hasVoted}
                          isGolden={hasGolden}
                          index={index}
                          onClick={() => handleVote(id)}
                        />
                      );
                    })}
                </div>

                {/* Pass button — in the voting area */}
                {!me.hasVoted && (
                  <div className="mx-auto mt-4 max-w-3xl lg:max-w-5xl">
                    <button
                      onClick={onVotePass}
                      className="w-full rounded-2xl border-2 border-dashed border-[var(--border)] px-5 py-4 text-sm text-[var(--text-muted)] transition-colors hover:border-[var(--accent-dim)] hover:text-[var(--text)]"
                    >
                      Passer — aucune ne me fait rire
                    </button>
                  </div>
                )}
              </div>

              {/* My card — pinned at bottom */}
              {(() => {
                const myEntry = votePlayerOrder.find((p) => p.isMine);
                if (!myEntry?.player) return null;
                const myGolden = myEntry.player.selectedCards.some(
                  (c) => c.uid === state.goldenCardUid
                );
                return (
                  <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--border)] bg-[var(--surface)] px-4 py-3 safe-bottom">
                    <p className="mb-2 text-center text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                      Ta réponse
                    </p>
                    <div className="mx-auto max-w-3xl opacity-60 lg:max-w-5xl">
                      <VoteCard
                        questionText={state.currentQuestion.text}
                        answers={myEntry.player.selectedCards}
                        authorName={me.name}
                        authorAvatarIndex={me.avatarIndex}
                        showAuthor={false}
                        selected={false}
                        disabled={true}
                        isMine={true}
                        isGolden={myGolden}
                        index={0}
                        onClick={() => {}}
                      />
                    </div>
                    {me.hasVoted && (
                      <p className="mt-2 text-center text-sm text-[var(--text-muted)]">
                        En attente des autres votes...
                      </p>
                    )}
                  </div>
                );
              })()}
            </motion.div>
          )}

          {/* RECAP PHASE */}
          {isRecap && (
            <motion.div
              key="recap"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-1 flex-col"
            >
              {/* Question reminder */}
              <div className="flex justify-center px-4 py-3">
                <QuestionCard
                  text={state.currentQuestion.text}
                  pick={state.currentQuestion.pick}
                  compact
                />
              </div>

              {/* All answers sorted by votes desc */}
              <div className="px-4 pb-6">
                <div className="mx-auto grid max-w-3xl grid-cols-1 gap-3 md:max-w-4xl md:grid-cols-2 md:[&>*:first-child]:col-span-2">
                  {(() => {
                    const winnerSet = new Set(state.roundWinnerIds);
                    const recapPlayers = state.randomizedPlayersOrder
                      .map((id) => ({
                        id,
                        player: state.players.get(id)!,
                        votes: state.roundVoteCounts[id] ?? 0,
                      }))
                      .filter((p) => p.player)
                      .sort((a, b) => b.votes - a.votes);

                    return recapPlayers.map(({ id, player, votes }, index) => {
                      const isWinner = winnerSet.has(id);
                      const hasGolden = player.selectedCards.some(
                        (c) => c.uid === state.goldenCardUid
                      );
                      const playedGoldenAndWon = isWinner && hasGolden;
                      const points = playedGoldenAndWon ? 2 : 1;

                      return (
                        <motion.div
                          key={id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <VoteCard
                            questionText={state.currentQuestion.text}
                            answers={player.selectedCards}
                            authorName={player.name}
                            authorAvatarIndex={player.avatarIndex}
                            showAuthor={true}
                            selected={false}
                            disabled={true}
                            isMine={id === myId}
                            isGolden={hasGolden}
                            isWinner={isWinner}
                            voteCount={votes}
                            index={0}
                            onClick={() => {}}
                          />
                          {isWinner && (
                            <div className="mt-1.5 text-center">
                              <span
                                className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${
                                  playedGoldenAndWon
                                    ? "bg-[var(--yellow)]/20 text-[var(--yellow)]"
                                    : "bg-[var(--green)]/20 text-[var(--green)]"
                                }`}
                              >
                                +{points} pt{points > 1 ? "s" : ""}
                                {playedGoldenAndWon && " ✨"}
                              </span>
                            </div>
                          )}
                        </motion.div>
                      );
                    });
                  })()}
                </div>
              </div>
            </motion.div>
          )}

          {/* READY PHASE */}
          {isReady && (
            <motion.div
              key="ready"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-1 items-center justify-center"
            >
              <div className="text-center">
                <p className="font-game text-2xl text-white">
                  Manche {state.nbRound}
                </p>
                <p className="mt-2 text-sm text-[var(--text-muted)]">
                  Préparez-vous...
                </p>
              </div>
            </motion.div>
          )}

          {/* GAMEOVER */}
          {isGameover && (
            <motion.div
              key="gameover"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-1 flex-col items-center justify-center px-6"
              style={{
                background:
                  "linear-gradient(135deg, #0f0f13 0%, #1a1030 40%, #2d1b4e 100%)",
              }}
            >
              {/* Decorative bg */}
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 20% 20%, rgba(251,191,36,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 30%, rgba(192,132,252,0.15) 0%, transparent 50%), radial-gradient(circle at 50% 80%, rgba(74,222,128,0.1) 0%, transparent 50%)",
                }}
              />

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="relative z-10 text-6xl sm:text-7xl lg:text-8xl"
              >
                👑
              </motion.div>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="relative z-10 mt-4 font-game text-4xl text-[var(--yellow)] sm:text-5xl lg:text-6xl"
                style={{ textShadow: "0 0 40px rgba(251,191,36,0.4)" }}
              >
                {state.players.get(state.winnerId)?.name}
              </motion.p>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="relative z-10 mt-4 max-w-xs text-center font-game text-base text-[var(--text-muted)]"
              >
                {gameoverText}
              </motion.p>

              {/* Final scores */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="relative z-10 mt-8 w-full max-w-xs sm:max-w-sm lg:max-w-md"
              >
                {sortedPlayers.map(([id, player], index) => (
                  <div
                    key={id}
                    className={`mb-1.5 flex items-center rounded-xl px-4 py-2.5 ${
                      index === 0
                        ? "border border-[var(--yellow)]/20 bg-[var(--yellow)]/10"
                        : "border border-white/5 bg-white/5"
                    }`}
                  >
                    <span
                      className={`w-6 text-sm font-bold ${
                        index === 0
                          ? "text-[var(--yellow)]"
                          : "text-[var(--text-muted)]"
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span className="flex-1 text-sm font-medium">
                      {player.name}
                    </span>
                    <span className="text-base font-bold text-[var(--yellow)]">
                      {player.score}
                    </span>
                  </div>
                ))}
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="relative z-10 mt-6 flex gap-3"
              >
                {isHost && (
                  <button
                    onClick={onRematch}
                    className="rounded-xl bg-[var(--accent)] px-8 py-3 text-sm font-semibold text-white transition-all hover:bg-[var(--accent-dim)]"
                  >
                    Relancer
                  </button>
                )}
                <button
                  onClick={onLeave}
                  className="rounded-xl border border-[var(--border)] px-8 py-3 text-sm font-semibold text-[var(--text-muted)] transition-all hover:bg-[var(--surface-2)]"
                >
                  Quitter
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
