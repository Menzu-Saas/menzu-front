import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { interactive } from "./button";

export interface ChipProps extends ComponentProps<"button"> {
  active?: boolean;
  count?: number;
}

/** Filter chip: padding 8x13, radius 11, 12px; active = inverse bg, white 700 (design-system §8). */
export function Chip({ active = false, count, children, className, type = "button", ...props }: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={active}
      className={cn(
        "inline-flex shrink-0 items-center whitespace-nowrap rounded-md border px-3.25 py-2 text-caption",
        interactive,
        active
          ? "border-inverse bg-inverse font-bold text-white not-disabled:hover:bg-inverse-hover"
          : "border-line bg-surface-muted font-semibold text-ink-secondary not-disabled:hover:border-line-strong",
        className,
      )}
      {...props}
    >
      {children}
      {/* A leading space inside a flex item collapses: space the count with a margin instead. */}
      {count != null && (
        <>
          {" "}
          <span className="ml-1">· {count}</span>
        </>
      )}
    </button>
  );
}
