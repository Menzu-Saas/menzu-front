import { HEX_COLOR } from "@/lib/schemas/settings";

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** "#RRGGBB" para canais 0–255; null se não estiver nesse formato. */
export function hexToRgb(hex: string): Rgb | null {
  if (!HEX_COLOR.test(hex)) return null;
  const value = Number.parseInt(hex.slice(1), 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

/** Canais para "#RRGGBB" em maiúsculas; cada canal é arredondado e limitado a 0–255. */
export function rgbToHex({ r, g, b }: Rgb): string {
  const part = (channel: number) => Math.min(255, Math.max(0, Math.round(channel))).toString(16).padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`.toUpperCase();
}
