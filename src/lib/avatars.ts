export const AVATAR_COLORS = [
  "bg-[var(--accent-dim)]",
  "bg-emerald-600",
  "bg-amber-600",
  "bg-blue-600",
  "bg-rose-600",
  "bg-teal-600",
  "bg-orange-600",
  "bg-indigo-600",
];

export const AVATAR_EMOJIS = ["🐻", "🦊", "🐸", "🐙", "🦁", "🐧", "🐯", "🦄"];

export function getAvatar(avatarIndex: number) {
  const i = avatarIndex % AVATAR_COLORS.length;
  return {
    color: AVATAR_COLORS[i],
    emoji: AVATAR_EMOJIS[i],
  };
}
