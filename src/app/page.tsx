import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/landing-page";

export const metadata: Metadata = {
  title: { absolute: "Menzu · Cardápio digital, pedidos e cozinha para restaurantes" },
  description: "Cardápio digital, pedidos, cozinha e entrega conectados. Seu cliente pede pelo celular, sem aplicativo.",
};

export default function Home() {
  return <LandingPage loginHref="/acessar" signupHref="/cadastro" exampleHref="/cardapio/burger-house" />;
}
