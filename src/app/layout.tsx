import type { Metadata } from "next";
import { Toaster } from "@/components/ui/toast";
import { fontVariables } from "@/app/fonts";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: { default: "Menzu Restaurante BETA", template: "%s · Menzu Restaurante BETA" },
  description: "Gerencie o cardápio, os pedidos e a equipe do seu restaurante.",
};

// suppressHydrationWarning no <html>: a landing marca data-motion antes da pintura (vale só para os atributos deste elemento).
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${fontVariables} h-full`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-canvas font-sans text-ink antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
