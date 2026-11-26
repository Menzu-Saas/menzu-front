"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FolderPlus, MoreHorizontal, Pencil, Plus, Trash2, Eye, EyeOff, Layers } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import {
  Badge,
  Button,
  Card,
  ConfirmationDialog,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  IconButton,
  notify,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/money";
import {
  createCategoryAction,
  createMenuAction,
  deleteCategoryAction,
  deleteMenuAction,
  reorderAction,
  setCategoryActiveAction,
  setProductAvailabilityAction,
  updateCategoryAction,
  updateMenuAction,
  type MenuActionResult,
} from "@/server/actions/menu";
import type { AddonGroupRow, AdminCategory, AdminMenu, AdminProductCard } from "@/server/queries/menu";
import { CategoryList, type CategoryListItem } from "./category-list";
import { NameDialog, type NameDialogValues } from "./name-dialog";
import { NewProductCard, ProductCard } from "./product-card";
import { useRestaurantId } from "@/components/admin/current-restaurant";
import { ACTION_FAILED } from "@/components/admin/safely";

export interface MenuManagerProps {
  menus: AdminMenu[];
  menuId: string;
  categories: AdminCategory[];
  products: AdminProductCard[];
  addonGroups: AddonGroupRow[];
  initialCategoryId: string | null;
}

type Dialog =
  | { kind: "new-menu" }
  | { kind: "rename-menu" }
  | { kind: "delete-menu" }
  | { kind: "new-category" }
  | { kind: "rename-category"; category: AdminCategory }
  | { kind: "delete-category"; category: CategoryListItem }
  | null;

function errorOf(res: MenuActionResult) {
  return res.ok ? null : (res.error ?? Object.values(res.fieldErrors ?? {})[0] ?? "Não foi possível salvar.");
}

/** Reference P3 "Gestão de cardápio": menu switcher, categories column, product grid, addon groups strip. */
export function MenuManager({ menus, menuId, categories, products, addonGroups, initialCategoryId }: MenuManagerProps) {
  const rid = useRestaurantId();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [selected, setSelected] = useState<string | null>(initialCategoryId);
  // Optimistic overlays, dropped once the server round-trip (with revalidated props) completes.
  const [order, setOrder] = useState<string[] | null>(null);
  const [availability, setAvailability] = useState<Record<string, boolean>>({});

  const menu = menus.find((m) => m.id === menuId) ?? menus[0];

  const orderedCategories = useMemo(() => {
    if (!order) return categories;
    const byId = new Map(categories.map((c) => [c.id, c]));
    const sorted = order.map((id) => byId.get(id)).filter((c): c is AdminCategory => Boolean(c));
    return sorted.length === categories.length ? sorted : categories;
  }, [categories, order]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of products) map.set(p.category_id, (map.get(p.category_id) ?? 0) + 1);
    return map;
  }, [products]);

  const current = orderedCategories.find((c) => c.id === selected) ?? orderedCategories[0] ?? null;
  const items = products
    .filter((p) => p.category_id === current?.id)
    .map((p) => (p.id in availability ? { ...p, is_available: availability[p.id] } : p));

  function selectCategory(id: string) {
    setSelected(id);
    const params = new URLSearchParams(window.location.search);
    params.set("categoria", id);
    window.history.replaceState(null, "", `?${params.toString()}`);
  }

  function run(action: () => Promise<MenuActionResult>, success?: string, after?: (res: MenuActionResult) => void) {
    return new Promise<MenuActionResult>((resolve) => {
      startTransition(async () => {
        let res: MenuActionResult;
        try {
          res = await action();
        } catch {
          // Offline / server error: toast instead of the error boundary (unsaved state survives).
          res = { ok: false, error: ACTION_FAILED };
        }
        const error = errorOf(res);
        if (error) notify.error(error);
        else if (success) notify.success(success);
        after?.(res);
        resolve(res);
      });
    });
  }

  function reorder(ids: string[]) {
    setOrder(ids);
    void run(() => reorderAction(rid, "categories", ids), undefined, () => setOrder(null));
  }

  function toggleProduct(id: string, available: boolean) {
    setAvailability((prev) => ({ ...prev, [id]: available }));
    void run(
      () => setProductAvailabilityAction(rid, id, available),
      available ? "Item disponível no cardápio" : "Item pausado",
      () =>
        setAvailability((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        }),
    );
  }

  async function submitDialog(values: NameDialogValues) {
    if (!dialog) return;
    let res: MenuActionResult;
    switch (dialog.kind) {
      case "new-menu":
        res = await createMenuAction(rid, { name: values.name });
        if (res.ok && res.id) router.push(`/painel/cardapio?menu=${res.id}`);
        break;
      case "rename-menu":
        res = await updateMenuAction(rid, menu.id, { name: values.name, is_active: menu.is_active });
        break;
      case "new-category":
        res = await createCategoryAction(rid, menu.id, { name: values.name, description: values.description });
        if (res.ok && res.id) selectCategory(res.id);
        break;
      case "rename-category":
        res = await updateCategoryAction(rid, dialog.category.id, {
          name: values.name,
          description: values.description,
          is_active: dialog.category.is_active,
        });
        break;
      default:
        return;
    }
    if (!res.ok) return { fieldErrors: res.fieldErrors, error: res.error };
    notify.success("Salvo");
  }

  const listItems: CategoryListItem[] = orderedCategories.map((c) => ({
    id: c.id,
    name: c.name,
    is_active: c.is_active,
    count: counts.get(c.id) ?? 0,
  }));

  const newItemHref = current ? `/painel/cardapio/produtos/novo?categoria=${current.id}` : "";

  return (
    <div className="flex flex-col gap-5">
      {/* Menu switcher */}
      <div className="flex flex-wrap items-center gap-2.5">
        <Select
          value={menu.id}
          onValueChange={(id) => {
            setSelected(null);
            router.push(`/painel/cardapio?menu=${id}`);
          }}
        >
          <SelectTrigger aria-label="Cardápio" className="w-auto min-w-0 flex-1 bg-surface sm:min-w-56 sm:flex-none">
            <SelectValue>{menu.is_active ? menu.name : `${menu.name} (oculto)`}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {menus.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.is_active ? m.name : `${m.name} (oculto)`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <IconButton label="Ações do cardápio" icon={MoreHorizontal} variant="outline" size={40} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" onCloseAutoFocus={(e) => e.preventDefault()}>
            <DropdownMenuItem icon={Pencil} onSelect={() => setDialog({ kind: "rename-menu" })}>
              Renomear cardápio
            </DropdownMenuItem>
            <DropdownMenuItem
              icon={menu.is_active ? EyeOff : Eye}
              onSelect={() =>
                void run(
                  () => updateMenuAction(rid, menu.id, { name: menu.name, is_active: !menu.is_active }),
                  menu.is_active ? "Cardápio ocultado" : "Cardápio publicado",
                )
              }
            >
              {menu.is_active ? "Ocultar do público" : "Mostrar ao público"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              icon={Trash2}
              tone="danger"
              disabled={menus.length <= 1}
              onSelect={() => setDialog({ kind: "delete-menu" })}
            >
              Excluir cardápio
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {!menu.is_active && <Badge tone="warning">OCULTO</Badge>}
        <Button
          variant="outline"
          className="ml-auto"
          aria-label="Novo cardápio"
          onClick={() => setDialog({ kind: "new-menu" })}
        >
          <Plus size={16} strokeWidth={2.1} aria-hidden="true" />
          <span className="sm:hidden">Novo</span>
          <span className="hidden sm:inline">Novo cardápio</span>
        </Button>
      </div>

      {/* P3 frame */}
      <Card elevated radius="6xl" padding="none" className="flex flex-wrap gap-6 p-4 sm:p-6.5">
        <section aria-labelledby="mz-categories-title" className="flex min-w-0 flex-[1_1_190px] flex-col gap-3 lg:max-w-62">
          <h2 id="mz-categories-title" className="text-item font-extrabold text-ink">
            Categorias
          </h2>
          {listItems.length > 0 && (
            <CategoryList
              categories={listItems}
              selectedId={current?.id ?? null}
              onSelect={selectCategory}
              onReorder={reorder}
              onRename={(c) => {
                const category = categories.find((x) => x.id === c.id);
                if (category) setDialog({ kind: "rename-category", category });
              }}
              onToggleActive={(c) =>
                void run(
                  () => setCategoryActiveAction(rid, c.id, !c.is_active),
                  c.is_active ? "Categoria oculta do cardápio" : "Categoria visível no cardápio",
                )
              }
              onDelete={(c) => setDialog({ kind: "delete-category", category: c })}
            />
          )}
          <button
            type="button"
            onClick={() => setDialog({ kind: "new-category" })}
            className={cn(
              "rounded-lg border border-dashed border-line-strong px-3.25 py-2.75 text-center text-body-sm font-bold text-ink-muted",
              "transition-[border-color,background-color,color] duration-150 ease-out hover:border-brand-tint-border hover:bg-brand-tint hover:text-brand",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
            )}
          >
            + Nova categoria
          </button>
        </section>

        <section aria-labelledby="mz-products-title" className="flex min-w-0 flex-[3_1_420px] flex-col gap-4.5">
          {current ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <h2 id="mz-products-title" className="text-title-md text-ink">
                    {current.name} · {items.length === 1 ? "1 item" : `${items.length} itens`}
                  </h2>
                  {!current.is_active && (
                    <p className="text-caption text-ink-muted">Categoria oculta: os clientes não a veem no cardápio.</p>
                  )}
                </div>
                <Button asChild>
                  <Link href={newItemHref}>+ Adicionar item</Link>
                </Button>
              </div>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,230px),1fr))] gap-4">
                {items.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    href={`/painel/cardapio/produtos/${p.id}`}
                    onToggle={(available) => toggleProduct(p.id, available)}
                  />
                ))}
                <NewProductCard href={newItemHref} categoryName={current.name} />
              </div>
            </>
          ) : (
            <EmptyState
              icon={FolderPlus}
              title="Crie sua primeira categoria"
              description="Organize o cardápio em categorias como Lanches, Bebidas e Sobremesas."
              action={<Button onClick={() => setDialog({ kind: "new-category" })}>+ Nova categoria</Button>}
            />
          )}

          <AddonStrip groups={addonGroups} />
        </section>
      </Card>

      <NameDialog
        open={dialog?.kind === "new-menu" || dialog?.kind === "rename-menu"}
        onOpenChange={(open) => !open && setDialog(null)}
        title={dialog?.kind === "rename-menu" ? "Renomear cardápio" : "Novo cardápio"}
        label="Nome do cardápio"
        placeholder="Ex.: Almoço executivo"
        submitLabel={dialog?.kind === "rename-menu" ? "Salvar" : "Criar cardápio"}
        initial={dialog?.kind === "rename-menu" ? { name: menu.name } : undefined}
        onSubmit={submitDialog}
      />
      <NameDialog
        open={dialog?.kind === "new-category" || dialog?.kind === "rename-category"}
        onOpenChange={(open) => !open && setDialog(null)}
        title={dialog?.kind === "rename-category" ? "Editar categoria" : "Nova categoria"}
        label="Nome da categoria"
        placeholder="Ex.: Massas"
        submitLabel={dialog?.kind === "rename-category" ? "Salvar" : "Criar categoria"}
        withDescription
        initial={
          dialog?.kind === "rename-category"
            ? { name: dialog.category.name, description: dialog.category.description ?? "" }
            : undefined
        }
        onSubmit={submitDialog}
      />
      <ConfirmationDialog
        open={dialog?.kind === "delete-category"}
        onOpenChange={(open) => !open && setDialog(null)}
        tone="danger"
        title="Excluir categoria?"
        description={
          dialog?.kind === "delete-category"
            ? dialog.category.count > 0
              ? `"${dialog.category.name}" e ${dialog.category.count === 1 ? "o item dela" : `os ${dialog.category.count} itens dela`} serão excluídos. Pedidos antigos não são afetados.`
              : `"${dialog.category.name}" será excluída.`
            : ""
        }
        confirmLabel="Excluir"
        onConfirm={async () => {
          if (dialog?.kind !== "delete-category") return;
          const res = await deleteCategoryAction(rid, dialog.category.id);
          const error = errorOf(res);
          if (error) {
            notify.error(error);
            throw new Error(error);
          }
          if (selected === dialog.category.id) setSelected(null);
          notify.success("Categoria excluída");
        }}
      />
      <ConfirmationDialog
        open={dialog?.kind === "delete-menu"}
        onOpenChange={(open) => !open && setDialog(null)}
        tone="danger"
        title="Excluir cardápio?"
        description={`"${menu.name}", suas categorias e itens serão excluídos. Pedidos antigos não são afetados.`}
        confirmLabel="Excluir"
        onConfirm={async () => {
          const res = await deleteMenuAction(rid, menu.id);
          const error = errorOf(res);
          if (error) {
            notify.error(error);
            throw new Error(error);
          }
          notify.success("Cardápio excluído");
          router.push("/painel/cardapio");
        }}
      />
    </div>
  );
}

/** Reference "Grupo de adicionais" strip: the restaurant's addon groups as pills, linking to the library. */
function AddonStrip({ groups }: { groups: AddonGroupRow[] }) {
  return (
    <div className="flex flex-col gap-3.5 rounded-4xl border border-line p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-item font-extrabold text-ink">Grupos de complementos</h2>
        <Link href="/painel/complementos" className="text-body-sm font-bold text-brand">
          Gerenciar
        </Link>
      </div>
      <div className="flex flex-wrap gap-2.5">
        {groups.map((g) => {
          const from = Math.min(...g.options.map((o) => o.price_cents));
          return (
            <Link
              key={g.id}
              href={`/painel/complementos?grupo=${g.id}`}
              className="flex items-center gap-2.5 rounded-lg border border-line px-3.5 py-2.75 transition-colors duration-150 hover:border-line-strong"
            >
              <Layers size={16} strokeWidth={1.8} aria-hidden="true" className="text-ink-subtle" />
              <span className="text-body-sm font-semibold text-ink">{g.name}</span>
              <span className="text-body-sm font-extrabold text-brand">
                {g.options.length === 0 ? "sem opções" : from > 0 ? `a partir de ${formatMoney(from)}` : `${g.options.length} opções`}
              </span>
            </Link>
          );
        })}
        <Link
          href="/painel/complementos?novo=1"
          className="rounded-lg border border-dashed border-line-strong px-3.5 py-2.75 text-body-sm font-bold text-ink-muted transition-colors duration-150 hover:border-brand-tint-border hover:text-brand"
        >
          + Grupo
        </Link>
      </div>
    </div>
  );
}
