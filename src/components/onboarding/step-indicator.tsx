import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

export interface WizardStep {
  label: string;
}

/** "01 · Restaurante" style progress: done = success check, current = accent, upcoming = muted. */
export function StepIndicator({ steps, current }: { steps: WizardStep[]; current: number }) {
  return (
    <ol className="flex gap-2">
      {steps.map((step, i) => {
        const state = i < current ? "done" : i === current ? "current" : "upcoming";
        return (
          <li key={step.label} aria-current={state === "current" ? "step" : undefined} className={cn("flex min-w-0 flex-col gap-2", state === "current" ? "flex-2 sm:flex-1" : "flex-1")}>
            <span
              aria-hidden="true"
              className={cn(
                "h-1.5 rounded-full transition-colors duration-150 ease-out",
                state === "upcoming" ? "bg-surface-muted" : state === "done" ? "bg-success" : "bg-accent",
              )}
            />
            <span
              className={cn(
                "flex items-center gap-1.5 text-micro font-extrabold uppercase tracking-eyebrow",
                state === "upcoming" ? "text-ink-faint" : state === "done" ? "text-success" : "text-brand",
              )}
            >
              {state === "done" ? (
                <Check size={14} strokeWidth={2.6} aria-hidden="true" />
              ) : (
                <span className="whitespace-nowrap tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                  <span className={cn(state !== "current" && "hidden sm:inline")}> ·</span>
                </span>
              )}
              {/* On phones only the current step shows its name; the others keep their number. */}
              <span className={cn("truncate", state !== "current" && "sr-only sm:not-sr-only")}>{step.label}</span>
              <span className="sr-only">
                {state === "done" ? " (concluído)" : state === "current" ? " (etapa atual)" : ""}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
