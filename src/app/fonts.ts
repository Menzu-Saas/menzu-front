import { DM_Mono, Plus_Jakarta_Sans } from "next/font/google";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
  display: "swap",
});

/** CSS variables for the Menzu fonts, applied on <html> by the root layout and global-error. */
export const fontVariables = `${jakarta.variable} ${dmMono.variable}`;
