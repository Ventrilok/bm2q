"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function LandingPage() {
  const [playerName, setPlayerName] = useState("");
  const router = useRouter();

  const handleEnter = () => {
    if (playerName.trim()) {
      const encoded = encodeURIComponent(playerName.trim());
      router.push(`/lobby?name=${encoded}`);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6"
      style={{
        background: "linear-gradient(135deg, #0f0f13 0%, #1a1030 50%, #0f0f13 100%)",
      }}
    >
      {/* Decorative gradients */}
      <div className="pointer-events-none absolute right-[-50px] top-[10%] h-[300px] w-[300px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(192,132,252,0.15), transparent 70%)" }}
      />
      <div className="pointer-events-none absolute bottom-[15%] left-[-30px] h-[250px] w-[250px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(251,191,36,0.1), transparent 70%)" }}
      />

      {/* Logo */}
      <motion.div
        className="relative z-10 mb-12 text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="font-game text-5xl tracking-wider text-white sm:text-7xl lg:text-8xl">
          BM<span className="text-[var(--yellow)]">2</span>Q
        </h1>
        <p className="mt-2 text-xs uppercase tracking-[4px] text-[var(--text-muted)] sm:text-sm sm:tracking-[6px]">
          Blanc Manger Coco
        </p>
      </motion.div>

      {/* Name form */}
      <motion.div
        className="relative z-10 w-full max-w-xs sm:max-w-sm lg:max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <input
          type="text"
          placeholder="Ton nom ici..."
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleEnter()}
          className="mb-3 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 text-base text-[var(--text)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] sm:px-5 sm:py-4 sm:text-lg"
        />
        <button
          onClick={handleEnter}
          disabled={!playerName.trim()}
          className="w-full rounded-xl bg-[var(--accent)] px-6 py-3 text-base font-semibold text-white transition-all hover:bg-[var(--accent-dim)] hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 sm:py-3.5 sm:text-lg"
        >
          Entrer
        </button>
      </motion.div>
    </div>
  );
}
