"use client";

import type { PlayerState } from "@/lib/use-game-room";
import { getAvatar } from "@/lib/avatars";

interface LeaderboardProps {
  players: Map<string, PlayerState>;
  myId: string;
}

export function Leaderboard({ players, myId }: LeaderboardProps) {
  const entries = Array.from(players.entries());

  return (
    <div className="flex gap-1.5 overflow-x-auto border-b border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 scrollbar-hide sm:flex-wrap sm:justify-center sm:overflow-x-visible">
      {entries.map(([id, player]) => {
        const avatar = getAvatar(player.avatarIndex);
        return (
          <div
            key={id}
            className={`flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs ${
              id === myId
                ? "border border-[var(--accent-dim)] bg-[var(--accent)]/10"
                : player.ready
                  ? "border border-[var(--green-dim)] bg-[var(--green)]/10"
                  : "bg-[var(--surface-2)]"
            }`}
          >
            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${avatar.color}`}>
              {avatar.emoji}
            </span>
            <span className="max-w-[60px] truncate text-[var(--text-muted)] sm:max-w-[100px]">
              {player.name}
            </span>
            <span className="text-sm font-bold text-[var(--yellow)]">
              {player.score}
            </span>
          </div>
        );
      })}
    </div>
  );
}
