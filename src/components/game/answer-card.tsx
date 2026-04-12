"use client";

import { motion } from "framer-motion";

interface AnswerCardProps {
  text: string;
  index: number;
  selected: boolean;
  selectedPosition: number;
  disabled: boolean;
  isGolden?: boolean;
  onClick: () => void;
}

export function AnswerCard({
  text,
  index,
  selected,
  selectedPosition,
  disabled,
  isGolden,
  onClick,
}: AnswerCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
      whileHover={disabled ? {} : { y: -4, scale: 1.03 }}
      whileTap={disabled ? {} : { scale: 0.97 }}
      onClick={disabled ? undefined : onClick}
      className={`relative flex min-h-[100px] cursor-pointer flex-col rounded-xl border-2 bg-[var(--card-white)] p-3 shadow-md transition-shadow min-[480px]:min-h-[120px] min-[480px]:p-4 md:min-h-[140px] md:p-5 ${
        selected
          ? "border-[var(--accent)] shadow-[0_8px_30px_rgba(192,132,252,0.3)]"
          : isGolden
            ? "border-[var(--yellow)] shadow-[0_0_20px_rgba(251,191,36,0.25)]"
            : "border-transparent hover:shadow-lg"
      } ${disabled ? "cursor-default opacity-60" : ""}`}
      style={selected ? { transform: "translateY(-6px)" } : {}}
    >
      {isGolden && (
        <span className="absolute left-2 top-2 text-sm">✨</span>
      )}
      {selected && selectedPosition > 0 && (
        <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-bold text-white">
          {selectedPosition}
        </span>
      )}
      <p className="flex-1 font-game text-sm leading-relaxed text-[var(--text-dark)]">
        {text}
      </p>
      <span className="absolute bottom-1.5 right-2.5 font-game text-[8px] text-black/8">
        BM2Q
      </span>
    </motion.div>
  );
}
