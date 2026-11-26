"use client";

import { ArrowDown, ArrowUp, X } from "lucide-react";
import { useState, useTransition } from "react";
import { Button, Card, IconButton, notify, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Switch } from "@/components/ui";
import { useRestaurantId } from "@/components/admin/current-restaurant";
import type { MenuExperienceSettings, MenuSectionId } from "@/lib/menu-experience";
import { saveMenuExperienceAction } from "@/server/actions/menu-experience";

const labels: Record<MenuSectionId, string> = { offers: "Ofertas", bestsellers: "Mais pedidos", favorites: "Favoritos deste dispositivo", featured: "Destaques da loja" };

function moved<T>(items: T[], index: number, direction: number): T[] {
  const next = [...items];
  [next[index], next[index + direction]] = [next[index + direction], next[index]];
  return next;
}

export function MenuExperienceEditor({ settings, products }: { settings: MenuExperienceSettings; products: { id: string; name: string }[] }) {
  const rid = useRestaurantId();
  const [config, setConfig] = useState(settings);
  const [pending, startTransition] = useTransition();
  function save() {
    startTransition(async () => {
      try {
        const result = await saveMenuExperienceAction(rid, config);
        if (!result.ok) { notify.error(result.error ?? "Não foi possível salvar."); return; }
        notify.success("Apresentação do cardápio salva.");
      } catch { notify.error("Não foi possível salvar. Tente novamente."); }
    });
  }
  function arrows(index: number, length: number, label: string, move: (direction: number) => void) {
    return <>
      <IconButton label={`Mover ${label} para cima`} icon={ArrowUp} disabled={pending || index === 0} onClick={() => move(-1)} />
      <IconButton label={`Mover ${label} para baixo`} icon={ArrowDown} disabled={pending || index === length - 1} onClick={() => move(1)} />
    </>;
  }
  return <Card className="flex flex-col gap-4">
    <div><h2 className="text-h4 font-bold">Apresentação do cardápio</h2><p className="text-body-sm text-ink-muted">Ative e ordene as seções. Seções sem produtos ficam ocultas. Mais pedidos considera unidades de pedidos entregues e pagos nos últimos 30 dias.</p></div>
    <div className="flex flex-col gap-2">
      {config.sections.map((section, index) => <div key={section.id} className="flex items-center gap-2">
        <Switch aria-label={`Exibir ${labels[section.id]}`} checked={section.enabled} disabled={pending} onCheckedChange={(enabled) => setConfig({ ...config, sections: config.sections.map((item) => item.id === section.id ? { ...item, enabled } : item) })} />
        <span className="flex-1 text-body-sm">{labels[section.id]}</span>
        {arrows(index, config.sections.length, labels[section.id], (direction) => setConfig({ ...config, sections: moved(config.sections, index, direction) }))}
      </div>)}
    </div>
    <div className="flex flex-col gap-2">
      <h3 className="text-body font-bold">Produtos de destaque</h3>
      <Select value="" disabled={pending || config.featuredProductIds.length >= 50} onValueChange={(id) => setConfig({ ...config, featuredProductIds: [...config.featuredProductIds, id] })}>
        <SelectTrigger aria-label="Adicionar produto de destaque"><SelectValue placeholder="Adicionar produto de destaque" /></SelectTrigger>
        <SelectContent>{products.filter((product) => !config.featuredProductIds.includes(product.id)).map((product) => <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>)}</SelectContent>
      </Select>
      {config.featuredProductIds.map((id, index) => {
        const name = products.find((product) => product.id === id)?.name ?? "Produto removido";
        return <div key={id} className="flex items-center gap-2"><span className="min-w-0 flex-1 text-body-sm">{name}</span>
          {arrows(index, config.featuredProductIds.length, name, (direction) => setConfig({ ...config, featuredProductIds: moved(config.featuredProductIds, index, direction) }))}
          <IconButton label={`Remover ${name} dos destaques`} icon={X} disabled={pending} onClick={() => setConfig({ ...config, featuredProductIds: config.featuredProductIds.filter((productId) => productId !== id) })} />
        </div>;
      })}
      <p className="text-caption text-ink-muted">Somente produtos publicados em categorias e cardápios ativos aparecem para clientes.</p>
    </div>
    <Button className="self-start" loading={pending} onClick={save}>Salvar apresentação</Button>
  </Card>;
}
