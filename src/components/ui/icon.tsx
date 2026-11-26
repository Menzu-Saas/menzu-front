import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export type IconSize = 16 | 17 | 18 | 20 | 21 | 22 | 24 | 26;

export interface IconProps {
  icon: LucideIcon;
  size?: IconSize;
  /** Emphasis state: stroke 2.1 and brand colour (design-system §7). */
  active?: boolean;
  className?: string;
}

/**
 * Linear lucide icon with Menzu stroke rules: 1.8 default, 2.1 when active, round caps/joins.
 * Colour is inherited (currentColor) unless active; containers such as nav/tab bars set
 * `text-ink-subtle` for the resting colour.
 */
export function Icon({ icon: Glyph, size = 20, active = false, className }: IconProps) {
  return (
    <Glyph
      size={size}
      strokeWidth={active ? 2.1 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={cn("shrink-0", active && "text-brand", className)}
    />
  );
}
