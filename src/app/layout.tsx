import type { Metadata } from "next";
import { Toaster } from "@/components/ui/toast";
import { fontVariables } from "@/app/fonts";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: { default: "Menzu Restaurante BETA", template: "%s · Menzu Restaurante BETA" },
  description: "Gerencie o cardápio, os pedidos e a equipe do seu restaurante.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${fontVariables} h-full`}>
      <body className="min-h-full flex flex-col bg-canvas font-sans text-ink antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
