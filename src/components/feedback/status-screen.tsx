import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Card, EmptyState, Logo } from "@/components/ui";

export interface StatusScreenProps {
  icon: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  /** Full-viewport page with the Menzu logo (public/root boundaries) or an inline block (inside a shell). */
  variant?: "page" | "inline";
}

/** Shared body of the not-found and error boundaries: Menzu logo + EmptyState on the canvas. */
export function StatusScreen({ icon, title, description, action, variant = "page" }: StatusScreenProps) {
  const body = (
    <Card elevated={variant === "page"} radius="6xl" padding="lg" className="w-full max-w-md">
      <EmptyState icon={icon} title={title} description={description} action={action} />
    </Card>
  );
  if (variant === "inline") {
    return <div className="flex w-full flex-1 items-center justify-center px-4 py-10">{body}</div>;
  }
  return (
    <main className="flex min-h-dvh w-full flex-col items-center justify-center gap-8 bg-canvas px-4 py-10">
      <Link href="/" aria-label="Menzu — página inicial" className="rounded-md">
        <Logo size="lg" />
      </Link>
      {body}
    </main>
  );
}
