"use client";

import { motion } from "framer-motion";
import type { CardState } from "@/lib/use-game-room";
import { getAvatar } from "@/lib/avatars";

interface VoteCardProps {
  questionText: string;
  answers: CardState[];
  authorName: string;
  authorAvatarIndex?: number;
  showAuthor: boolean;
  selected: boolean;
  disabled: boolean;
  isMine?: boolean;
  isGolden?: boolean;
  isWinner?: boolean;
  voteCount?: number;
  index: number;
  onClick: () => void;
}

export function VoteCard({
  questionText,
  answers,
  authorName,
  authorAvatarIndex,
  showAuthor,
  selected,
  disabled,
  isMine,
  isGolden,
  isWinner,
  voteCount,
  index,
  onClick,
}: VoteCardProps) {
  // Replace blanks with answer text highlighted in yellow
  let answerIndex = 0;
  const parts = questionText.split("______");
  const rendered = parts.flatMap((part, i) => {
    const elements = [<span key={`t-${i}`}>{part}</span>];
    if (i < parts.length - 1 && answerIndex < answers.length) {
      const answer = answers[answerIndex++];
      elements.push(
        <span
          key={`a-${i}`}
          className="font-bold text-[var(--yellow)] underline decoration-[var(--yellow)]/30 underline-offset-2"
        >
          {answer.text}
        </span>
      );
    }
    return elements;
  });

  return (
    <motion.div
      initial={{ opacity: 0, rotateY: 90 }}
      animate={{ opacity: 1, rotateY: 0 }}
      transition={{ delay: index * 0.15, duration: 0.4, type: "spring" }}
      whileHover={disabled ? {} : { y: -2 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      onClick={disabled ? undefined : onClick}
      className={`relative rounded-2xl border-2 bg-[var(--card-dark)] p-5 transition-all ${
        isWinner
          ? isMine
            ? "border-[var(--green)] shadow-[0_0_20px_rgba(74,222,128,0.2)] ring-2 ring-[var(--accent)]/40"
            : "border-[var(--green)] shadow-[0_0_20px_rgba(74,222,128,0.2)]"
          : isMine && voteCount !== undefined
            ? "cursor-default border-[var(--accent-dim)]/40 ring-2 ring-[var(--accent)]/30"
            : isMine
              ? "cursor-default border-[var(--accent-dim)]/40 opacity-60"
              : selected
              ? "cursor-pointer border-[var(--yellow)] shadow-[0_0_20px_rgba(251,191,36,0.2)]"
              : `cursor-pointer ${disabled ? "cursor-default opacity-70" : "hover:border-[var(--accent-dim)]"} border-[var(--border)]`
      }`}
    >
      {isGolden && (
        <span className="absolute right-3 top-3 text-sm">✨</span>
      )}
      {voteCount !== undefined && (
        <span className={`absolute left-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-bold ${
          isWinner
            ? "bg-[var(--green)]/20 text-[var(--green)]"
            : "bg-white/10 text-[var(--text-muted)]"
        }`}>
          {voteCount} vote{voteCount !== 1 ? "s" : ""}
        </span>
      )}
      <p className="font-game text-base leading-relaxed text-[var(--text)]">
        {rendered}
      </p>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: showAuthor || isMine ? 1 : 0.6 }}
        className="mt-3 flex items-center justify-end gap-1.5 text-xs italic text-[var(--text-muted)]"
      >
        {showAuthor && authorAvatarIndex !== undefined && (
          <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[8px] ${getAvatar(authorAvatarIndex).color}`}>
            {getAvatar(authorAvatarIndex).emoji}
          </span>
        )}
        <span>— {isMine ? "Ta réponse" : showAuthor ? authorName : "???"} —</span>
      </motion.div>
    </motion.div>
  );
}
