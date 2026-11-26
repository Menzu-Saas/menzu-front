import type { CSSProperties } from "react";
import { HEX_COLOR } from "@/lib/schemas/settings";

/** CSS custom property carrying the restaurant's own accent (consumed as Tailwind `*-restaurant`). */
export const RESTAURANT_ACCENT_VAR = "--mz-restaurant-accent";

/** Returns the colour only when it is a strict "#RRGGBB" value (uppercased), otherwise null. */
export function validRestaurantColor(value: unknown): string | null {
  return typeof value === "string" && HEX_COLOR.test(value) ? value.toUpperCase() : null;
}

/**
 * Inline style that exposes a validated restaurant colour as a CSS custom property. The value is
 * re-validated here and passed as a React style object — never concatenated into CSS text — so an
 * invalid or malicious stored value can never inject styles; it simply falls back to Menzu brand.
 */
export function restaurantAccentStyle(value: unknown): CSSProperties | undefined {
  const color = validRestaurantColor(value);
  return color ? ({ [RESTAURANT_ACCENT_VAR]: color } as CSSProperties) : undefined;
}
