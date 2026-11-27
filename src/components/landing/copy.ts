/** Texts and the fictional data shown in the landing demos (spec §6: one fictional restaurant). */

export const DEMO_RESTAURANT = "Cantina Aurora";

export type DishTone = "a" | "b" | "c" | "d";
export interface DemoDish {
  name: string;
  priceCents: number;
  /** Colour block shown in place of a photo. */
  tone: DishTone;
}

export const DEMO_DISHES: DemoDish[] = [
  { name: "Lasanha da casa", priceCents: 5890, tone: "a" },
  { name: "Nhoque ao sugo", priceCents: 4790, tone: "b" },
  { name: "Risoto de cogumelos", priceCents: 6290, tone: "c" },
  { name: "Tiramisù", priceCents: 2490, tone: "d" },
];

export const FLOW = ["Receber", "Preparar", "Despachar", "Acompanhar"] as const;

export const STEPS: [string, string][] = [
  ["Cadastre seu restaurante", "Configure a loja, os horários e as formas de atendimento em poucos minutos."],
  ["Monte seu cardápio", "Produtos, preços, adicionais e a cor da sua marca, prontos para o celular do cliente."],
  ["Receba e acompanhe pedidos", "Cozinha e entrega na mesma página, com toda a equipe vendo o mesmo pedido."],
];

export const FAQ: [string, string][] = [
  ["O cliente precisa instalar um aplicativo?", "Não. O cardápio, a sacola e o checkout abrem direto no navegador do celular ou do computador."],
  ["Posso organizar a equipe do restaurante?", "Sim. Convide sua equipe e defina o acesso de cada pessoa conforme o papel dela na operação."],
  ["O Menzu também acompanha as entregas?", "Sim. A loja e o cliente acompanham cada etapa do pedido até a entrega."],
];

export function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
