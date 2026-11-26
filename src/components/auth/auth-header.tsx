import type { ReactNode } from "react";

export function AuthHeader({ eyebrow, title, description }: { eyebrow?: string; title: ReactNode; description?: ReactNode }) {
  return (
    <header className="flex flex-col gap-1.5">
      {eyebrow && <p className="eyebrow text-ink-subtle">{eyebrow}</p>}
      <h1 className="text-title-xl text-ink">{title}</h1>
      {description && <p className="text-body-sm font-normal text-ink-muted">{description}</p>}
    </header>
  );
}
