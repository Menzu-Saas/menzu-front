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

/** h em graus (0–360); s e v de 0 a 1. HSB é o mesmo que HSV. */
export interface Hsv {
  h: number;
  s: number;
  v: number;
}

/** h em graus (0–360); s e l de 0 a 1. */
export interface Hsl {
  h: number;
  s: number;
  l: number;
}

function hueOf({ r, g, b }: Rgb, max: number, delta: number): number {
  if (delta === 0) return 0;
  const sector = max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  return (sector * 60 + 360) % 360;
}

export function rgbToHsv(rgb: Rgb): Hsv {
  const max = Math.max(rgb.r, rgb.g, rgb.b);
  const delta = max - Math.min(rgb.r, rgb.g, rgb.b);
  return { h: hueOf(rgb, max, delta), s: max === 0 ? 0 : delta / max, v: max / 255 };
}

export function rgbToHsl(rgb: Rgb): Hsl {
  const max = Math.max(rgb.r, rgb.g, rgb.b);
  const min = Math.min(rgb.r, rgb.g, rgb.b);
  const delta = max - min;
  const l = (max + min) / 510;
  return { h: hueOf(rgb, max, delta), s: delta === 0 ? 0 : delta / 255 / (1 - Math.abs(2 * l - 1)), l };
}

/** Monta R, G e B a partir do matiz, da intensidade da cor (chroma) e do quanto somar a cada canal. */
function fromChroma(h: number, chroma: number, base: number): Rgb {
  const sector = (((h % 360) + 360) % 360) / 60;
  const second = chroma * (1 - Math.abs((sector % 2) - 1));
  const table: [number, number, number][] = [[chroma, second, 0], [second, chroma, 0], [0, chroma, second], [0, second, chroma], [second, 0, chroma], [chroma, 0, second]];
  const [r, g, b] = table[Math.floor(sector)]!;
  const channel = (value: number) => Math.round((value + base) * 255);
  return { r: channel(r), g: channel(g), b: channel(b) };
}

export function hsvToRgb({ h, s, v }: Hsv): Rgb {
  const chroma = v * s;
  return fromChroma(h, chroma, v - chroma);
}

export function hslToRgb({ h, s, l }: Hsl): Rgb {
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  return fromChroma(h, chroma, l - chroma / 2);
}
