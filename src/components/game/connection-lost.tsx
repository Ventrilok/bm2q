"use client";

import { RefreshCw } from "lucide-react";

/**
 * Shown while the connection is lost and the seat is being recovered:
 * a banner on top, the game still visible behind but greyed out and not
 * clickable.
 */
export function ConnectionLostOverlay() {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-grayscale"
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-center justify-center gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3 shadow-lg">
        <RefreshCw className="h-5 w-5 shrink-0 animate-spin text-[var(--yellow)]" />
        <div className="text-sm">
          <p className="font-semibold text-white">Connexion perdue…</p>
          <p className="text-[var(--text-muted)]">reconnexion en cours</p>
        </div>
      </div>
    </div>
  );
}
