import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

export interface EmptyStateProps {
  icon: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center gap-3 px-5 py-10 text-center", className)}>
      <span className="inline-flex size-14 items-center justify-center rounded-3xl border border-brand-soft-border bg-brand-soft text-brand">
        <Icon icon={icon} size={24} />
      </span>
      <div className="flex max-w-sm flex-col gap-1">
        <p className="text-subheading text-ink">{title}</p>
        {description && <p className="text-body-sm font-normal text-ink-muted">{description}</p>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
