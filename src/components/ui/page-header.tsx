import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** Small uppercase line above the title, e.g. "PAINEL · PEDIDOS". */
  eyebrow?: ReactNode;
  className?: string;
}

/** Page title block (reference "Boa noite, Marina"): 22/800 title, 13 muted description, actions right. */
export function PageHeader({ title, description, actions, eyebrow, className }: PageHeaderProps) {
  return (
    <header className={cn("flex flex-wrap items-center justify-between gap-3.5", className)}>
      <div className="flex min-w-0 flex-col gap-0.5">
        {eyebrow && <p className="eyebrow tracking-widest text-ink-subtle">{eyebrow}</p>}
        <h1 className="text-title-xl text-ink">{title}</h1>
        {description && <p className="text-body-sm font-normal text-ink-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </header>
  );
}
