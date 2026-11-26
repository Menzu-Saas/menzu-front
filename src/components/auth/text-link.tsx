import Link, { type LinkProps } from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Brand link (design-system §10: brand → accent on hover). */
export function TextLink({ className, children, ...props }: LinkProps & { className?: string; children: ReactNode }) {
  return (
    <Link
      {...props}
      className={cn(
        "rounded-xs font-bold text-brand transition-colors duration-150 ease-out hover:text-accent",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        className,
      )}
    >
      {children}
    </Link>
  );
}
