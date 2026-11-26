/**
 * Tema do cardápio do cliente a partir da cor do restaurante: troca as variáveis de marca do Menzu
 * (src/styles/tokens.css), então botões, ícones, quadros e listras acompanham a cor escolhida.
 * O CSS é montado só com números calculados a partir de um "#RRGGBB" validado.
 */
import { hexToRgb, rgbToHex, type Rgb } from "@/lib/color";
import { validRestaurantColor } from "@/lib/restaurant-accent";

const WHITE = "#FFFFFF";
const BLACK = "#000000";
/** Cinza quente do texto secundário, usado nas legendas das listras. */
const MUTED = "#8A827B";
/** Contraste mínimo com branco: texto em negrito de botões e ícones sobre fundo claro. */
const MIN_CONTRAST = 3.5;

const channels = (hex: string): Rgb => hexToRgb(hex)!;

/** `amount` de `over` sobre `base` (0 = só base, 1 = só over). */
function mix(base: string, over: string, amount: number): string {
  const a = channels(base);
  const b = channels(over);
  const part = (x: number, y: number) => x + (y - x) * amount;
  return rgbToHex({ r: part(a.r, b.r), g: part(a.g, b.g), b: part(a.b, b.b) });
}

export function contrastWithWhite(hex: string): number {
  const { r, g, b } = channels(hex);
  const linear = (value: number) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
  return 1.05 / (luminance + 0.05);
}

/** A própria cor quando o texto branco é legível sobre ela; senão, escurecida só o necessário. */
export function readableBrand(hex: string): string {
  let result = hex.toUpperCase();
  for (let amount = 0.02; contrastWithWhite(result) < MIN_CONTRAST && amount <= 1; amount += 0.02) {
    result = mix(hex, BLACK, amount);
  }
  return result;
}

/** CSS que aplica a cor do restaurante, ou null para manter o tema do Menzu. */
export function restaurantThemeCss(value: unknown): string | null {
  const chosen = validRestaurantColor(value);
  if (!chosen) return null;
  const brand = readableBrand(chosen);
  const tint = (amount: number) => mix(WHITE, brand, amount);
  const { r, g, b } = channels(brand);
  const stripeInk = mix(MUTED, brand, 0.5);

  const variables: Record<string, string> = {
    "--mz-brand": brand,
    "--mz-accent": brand,
    "--mz-text-on-brand": tint(0.12),
    "--mz-brand-gradient-from": mix(brand, WHITE, 0.18),
    "--mz-brand-hero-from": mix(brand, WHITE, 0.12),
    "--mz-brand-soft": tint(0.08),
    "--mz-brand-soft-border": tint(0.2),
    "--mz-brand-tint": tint(0.04),
    "--mz-brand-tint-border": tint(0.38),
    "--mz-brand-dashed": tint(0.4),
    "--mz-brand-badge": tint(0.13),
    "--mz-stripe-food-a": tint(0.16),
    "--mz-stripe-food-b": tint(0.07),
    "--mz-stripe-food-ink": stripeInk,
    "--mz-stripe-cover-a": tint(0.22),
    "--mz-stripe-cover-b": tint(0.1),
    "--mz-stripe-cover-ink": stripeInk,
    "--mz-shadow-cta": `0 10px 22px -12px rgba(${r},${g},${b},0.9)`,
  };
  // ":root:root" vence o ":root" do tokens.css em qualquer ordem; no :root, vale também nas janelas
  // abertas por cima da página (sacola, detalhes do produto), que ficam fora do conteúdo.
  return `:root:root{${Object.entries(variables).map(([name, v]) => `${name}:${v}`).join(";")}}`;
}
