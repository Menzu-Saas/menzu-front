import { ChevronRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Icon } from "@/components/ui";
import { interactive } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export interface SummaryCardProps {
  icon: LucideIcon;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Accessible name of the "Alterar" button, e.g. "Alterar seus dados". */
  changeLabel: string;
  onChange: () => void;
  className?: string;
}

export function SummaryCard({ icon, title, subtitle, changeLabel, onChange, className }: SummaryCardProps) {
  return (
    <button type="button" aria-label={changeLabel} onClick={onChange} className={cn("flex min-h-11 w-full items-center gap-3 rounded-xl py-2 text-left hover:bg-surface-muted", interactive, className)}>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand">
        <Icon icon={icon} size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-body font-bold break-words text-ink">{title}</span>
        {subtitle && <span className="block text-caption font-normal break-words text-ink-muted">{subtitle}</span>}
      </span>
      <Icon icon={ChevronRight} size={18} className="shrink-0" />
    </button>
  );
}
