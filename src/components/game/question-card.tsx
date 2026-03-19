"use client";

import { motion } from "framer-motion";

interface QuestionCardProps {
  text: string;
  pick: number;
  compact?: boolean;
}

export function QuestionCard({ text, pick, compact }: QuestionCardProps) {
  // Replace blanks with styled spans
  const parts = text.split("______");
  const rendered = parts.flatMap((part, i) => {
    const elements = [<span key={`t-${i}`}>{part}</span>];
    if (i < parts.length - 1) {
      elements.push(
        <span
          key={`b-${i}`}
          className="mx-1 inline-block min-w-[80px] border-b-[3px] border-[var(--yellow)]"
        >
          &nbsp;
        </span>
      );
    }
    return elements;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative w-full overflow-hidden rounded-2xl border-2 border-[var(--border)] bg-[var(--card-dark)] ${
        compact ? "max-w-xl px-5 py-4" : "max-w-md px-6 py-6"
      }`}
    >
      {pick > 1 && (
        <span className="absolute right-3 top-3 rounded bg-[var(--yellow)] px-2 py-0.5 text-xs font-bold text-[var(--text-dark)]">
          Choisir {pick}
        </span>
      )}
      <p
        className={`font-game leading-relaxed text-white ${
          compact ? "text-sm" : "text-lg"
        }`}
      >
        {rendered}
      </p>
      <span className="absolute bottom-2 right-3 font-game text-[10px] text-white/10">
        BM2Q
      </span>
    </motion.div>
  );
}
