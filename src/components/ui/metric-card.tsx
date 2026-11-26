import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Skeleton } from "./skeleton";

export type MetricDeltaTone = "up" | "down" | "neutral" | "warn";

const DELTA: Record<MetricDeltaTone, string> = {
  up: "font-bold text-success",
  down: "font-bold text-danger",
  warn: "font-bold text-brand",
  neutral: "font-semibold text-ink-muted",
};

export interface MetricCardProps {
  label: string;
  value: ReactNode;
  delta?: { text: string; tone: MetricDeltaTone };
  loading?: boolean;
  className?: string;
}

/**
 * Dashboard metric (reference "FATURAMENTO R$ 4.128"): p18 r18 line border, 12/700 faint label, 25/800 value.
 * In a card narrower than 8rem of content (2 columns at 320px) the value steps down to 18/800 instead of truncating.
 */
export function MetricCard({ label, value, delta, loading = false, className }: MetricCardProps) {
  return (
    <div
      aria-busy={loading || undefined}
      className={cn("@container flex min-w-0 flex-col rounded-3xl border border-line bg-surface p-4.5", className)}
    >
      <p className="text-caption font-bold uppercase text-ink-faint">{label}</p>
      {loading ? (
        <>
          <Skeleton className="mt-2 h-7 w-24" radius="md" />
          <Skeleton className="mt-2 h-3.5 w-20" radius="sm" />
        </>
      ) : (
        <>
          <p className="mt-1.5 truncate text-metric tabular-nums text-ink @max-[8rem]:text-heading @max-[8rem]:font-extrabold">{value}</p>
          {delta && <p className={cn("mt-1 text-caption", DELTA[delta.tone])}>{delta.text}</p>}
        </>
      )}
    </div>
  );
}
