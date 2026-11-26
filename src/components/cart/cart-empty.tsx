import Link from "next/link";
import { ShoppingBag, Sparkles, Utensils } from "lucide-react";
import { Button, Icon } from "@/components/ui";

export function CartEmpty({ restaurantName, menuHref }: { restaurantName: string; menuHref?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <div aria-hidden="true" className="relative mb-2 flex size-24 items-center justify-center rounded-full bg-brand-soft text-brand">
        <ShoppingBag size={44} strokeWidth={1.8} />
        <span className="absolute -right-1 top-1 rounded-full bg-surface p-2 text-brand"><Icon icon={Sparkles} size={18} /></span>
        <span className="absolute -left-1 bottom-0 rounded-full border border-brand-soft-border bg-surface p-2 text-brand"><Icon icon={Utensils} size={20} /></span>
      </div>
      <h2 className="text-subheading text-ink">Seu carrinho está vazio</h2>
      <p className="max-w-xs text-body-sm text-ink-secondary">Que tal escolher algo gostoso de {restaurantName}?</p>
      {menuHref && <Button asChild variant="outline" className="mt-1">
        <Link href={menuHref}>Ver cardápio</Link>
      </Button>}
    </div>
  );
}
