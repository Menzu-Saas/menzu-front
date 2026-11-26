"use client";

import { LayoutDashboard } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, Logo } from "@/components/ui";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { cn } from "@/lib/cn";

export type ConnectionState = "live" | "connecting" | "offline";

const CONNECTION_COPY: Record<ConnectionState, string> = {
  live: "Ao vivo",
  connecting: "Conectando…",
  offline: "Sem conexão",
};

/** Green "Ao vivo" dot, pulsing warning while (re)connecting, danger when the last refresh failed. */
export function ConnectionDot({ state, className }: { state: ConnectionState; className?: string }) {
  return (
    <span
      role="status"
      className={cn(
        "inline-flex items-center gap-1.5 text-caption font-bold",
        state === "live" ? "text-success" : state === "connecting" ? "text-warning" : "text-danger",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-2.5 rounded-full",
          state === "live" ? "bg-success" : state === "connecting" ? "bg-warning motion-safe:animate-pulse" : "bg-danger",
        )}
      />
      <span className="max-sm:sr-only">{CONNECTION_COPY[state]}</span>
    </span>
  );
}

export interface OpsHeaderProps {
  /** "Cozinha" / "Entregas". */
  eyebrow: string;
  restaurantName: string;
  connection: ConnectionState;
  /** Clock (e.g. "19:42"). */
  clock?: ReactNode;
  /** Link back to the admin panel (OWNER/MANAGER/ATTENDANT). */
  showPanelLink?: boolean;
  actions?: ReactNode;
}

/**
 * Shared top bar of the operation screens (/cozinha, /entregas): Menzu logo, screen + restaurant,
 * live clock, connection dot and sign-out. Same tokens as the admin shell's mobile top bar.
 */
export function OpsHeader({ eyebrow, restaurantName, connection, clock, showPanelLink = false, actions }: OpsHeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-frame bg-surface">
      <div className="mx-auto flex h-16 w-full max-w-container items-center gap-3 px-4 sm:gap-4 sm:px-5">
        <Logo size="sm" withWordmark={false} />
        <h1 className="flex min-w-0 flex-1 flex-col">
          <span className="eyebrow text-ink-faint">
            {eyebrow}
            <span className="sr-only"> · </span>
          </span>
          <span className="truncate text-item font-extrabold text-ink">{restaurantName}</span>
        </h1>
        <ConnectionDot state={connection} />
        {clock && (
          <span className="rounded-lg border border-line bg-surface-muted px-3 py-1.5 text-subheading tabular-nums text-ink">
            {clock}
          </span>
        )}
        {showPanelLink && (
          <Link
            href="/painel/pedidos"
            aria-label="Voltar ao painel"
            title="Voltar ao painel"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-line bg-surface-muted text-ink transition-colors duration-150 ease-out hover:border-line-strong hover:text-ink max-sm:hidden"
          >
            <Icon icon={LayoutDashboard} size={20} />
          </Link>
        )}
        {actions}
        <SignOutButton variant="outline" size="sm" className="max-sm:px-2.5">
          <span className="max-sm:sr-only">Sair</span>
        </SignOutButton>
      </div>
    </header>
  );
}
