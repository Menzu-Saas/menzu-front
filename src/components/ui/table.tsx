import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/** Horizontally scrollable table wrapper (relative, so absolutely positioned sr-only labels scroll with it). */
export function Table({ className, ...props }: ComponentProps<"table">) {
  return (
    <div className="relative min-w-0 w-full max-w-full overflow-x-auto">
      <table className={cn("w-full border-collapse text-left", className)} {...props} />
    </div>
  );
}

export function THead({ className, ...props }: ComponentProps<"thead">) {
  return <thead className={cn("border-b border-line", className)} {...props} />;
}

export function TBody({ className, ...props }: ComponentProps<"tbody">) {
  return <tbody className={className} {...props} />;
}

export interface TRowProps extends ComponentProps<"tr"> {
  /** Clickable row: pointer + sunken hover. */
  interactive?: boolean;
}

/** Row: 1px line bottom border; hover surface-sunken. */
export function TRow({ className, interactive = false, ...props }: TRowProps) {
  return (
    <tr
      className={cn(
        "border-b border-line transition-colors duration-150 ease-out last:border-b-0",
        "[tbody_&]:hover:bg-surface-sunken",
        interactive &&
          "cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent",
        className,
      )}
      {...props}
    />
  );
}

/** Header cell: eyebrow 12/800 uppercase, ink-faint. */
export function THeadCell({ className, ...props }: ComponentProps<"th">) {
  return (
    <th
      scope="col"
      className={cn(
        "px-4 py-3 text-eyebrow font-extrabold whitespace-nowrap uppercase text-ink-faint first:pl-0 last:pr-0",
        className,
      )}
      {...props}
    />
  );
}

export function TCell({ className, ...props }: ComponentProps<"td">) {
  return (
    <td className={cn("px-4 py-3.5 align-middle text-body-sm text-ink first:pl-0 last:pr-0", className)} {...props} />
  );
}
