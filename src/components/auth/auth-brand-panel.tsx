import { BellRing, ChefHat, Store } from "lucide-react";
import { Icon } from "@/components/ui";
export function AuthBrandPanel() {
  return <aside className="mz-gradient-hero hidden flex-col justify-between gap-8 p-8 text-white lg:flex lg:p-12"><div className="flex flex-col gap-4"><span className="text-body-sm font-bold">Menzu para restaurantes</span><h2 className="max-w-md text-display">Seu restaurante em um só lugar</h2><p className="text-body text-on-brand">Gerencie o cardápio, acompanhe pedidos e organize sua equipe.</p></div><ul className="flex flex-col gap-4">{[{icon: Store, text: "Cardápio e operação da loja"}, {icon: BellRing, text: "Pedidos em tempo real"}, {icon: ChefHat, text: "Cozinha, entregas e equipe"}].map(({icon, text}) => <li key={text} className="flex items-center gap-3"><Icon icon={icon} size={20} />{text}</li>)}</ul></aside>;
}
