import localFont from "next/font/local";

// Fontes guardadas no projeto (ver font-files/README.md): o build não depende do Google Fonts.
const jakarta = localFont({
  src: [{ path: "./font-files/plus-jakarta-sans-latin.woff2", weight: "400 800", style: "normal" }],
  variable: "--font-jakarta",
  display: "swap",
});

const dmMono = localFont({
  src: [
    { path: "./font-files/dm-mono-400-latin.woff2", weight: "400", style: "normal" },
    { path: "./font-files/dm-mono-500-latin.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-dm-mono",
  display: "swap",
});

/** CSS variables for the Menzu fonts, applied on <html> by the root layout and global-error. */
export const fontVariables = `${jakarta.variable} ${dmMono.variable}`;
