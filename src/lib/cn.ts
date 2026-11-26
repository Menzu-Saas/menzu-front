import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const FONT_SIZES = [
  "display",
  "brand-title",
  "metric",
  "title-xl",
  "title-lg",
  "title-md",
  "title-sm",
  "heading",
  "subheading",
  "item",
  "body",
  "body-sm",
  "caption",
  "micro",
  "eyebrow",
  "placeholder",
];
const RADII = ["xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl", "5xl", "6xl", "full", "bar"];
const SHADOWS = ["frame", "card", "raised", "raised-lg", "segment", "cta", "cta-success"];

const twMerge = extendTailwindMerge({
  extend: {
    theme: { text: FONT_SIZES, radius: RADII, shadow: SHADOWS },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
