"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ExternalLink, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import {
  Button,
  Card,
  Checkbox,
  ConfirmationDialog,
  FormField,
  IconButton,
  Input,
  notify,
  SegmentedControl,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/money";
import type { FieldErrors } from "@/lib/schemas/auth";
import { fieldErrors } from "@/lib/schemas/auth";
import { productSchema, type ProductInput } from "@/lib/schemas/menu";
import { deleteProductAction, discardUploadedImageAction, saveProductAction } from "@/server/actions/menu";
import type { AddonGroupRow, AdminCategory, AdminMenu, ProductEditorData } from "@/server/queries/menu";
import { ImageUpload } from "./image-upload";
import { safely } from "@/components/admin/safely";

interface VariantRow {
  key: string;
  id?: string;
  name: string;
  price: string;
  is_available: boolean;
}

export interface ProductFormProps {
  restaurantId: string;
  product: ProductEditorData | null;
  defaultCategoryId: string | null;
  menus: AdminMenu[];
  categories: AdminCategory[];
  addonGroups: AddonGroupRow[];
}

/** cents → "29,90" for editing. */
const centsText = (cents: number | null | undefined) =>
  cents === null || cents === undefined ? "" : (cents / 100).toFixed(2).replace(".", ",");

/** Keys for rows added in the browser (existing rows use their database id, stable across SSR). */
const newKey = () => `new-${crypto.randomUUID()}`;

function SectionTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <h2 className="text-item font-extrabold text-ink">{title}</h2>
      {description && <p className="text-caption text-ink-muted">{description}</p>}
    </div>
  );
}

function groupSummary(g: AddonGroupRow) {
  const rule = g.is_required ? `Obrigatório · mín ${g.min_select}` : "Opcional";
  const opts = g.options.length === 1 ? "1 opção" : `${g.options.length} opções`;
  return `${rule} · máx ${g.max_select} · ${opts}`;
}

/** Product editor (create when `product` is null). Validates with the shared zod schema on both sides. */
export function ProductForm({ restaurantId, product, defaultCategoryId, menus, categories, addonGroups }: ProductFormProps) {
  const rid = restaurantId;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [categoryId, setCategoryId] = useState(product?.category_id ?? defaultCategoryId ?? "");
  const [price, setPrice] = useState(centsText(product?.price_cents));
  const [promoPrice, setPromoPrice] = useState(centsText(product?.promo_price_cents));
  const [available, setAvailable] = useState(product?.is_available ?? true);
  const [stock, setStock] = useState(product?.stock_quantity === null || !product ? "" : String(product.stock_quantity));
  const [status, setStatus] = useState<"ACTIVE" | "ARCHIVED">(product?.status ?? "ACTIVE");
  const [imageUrl, setImageUrl] = useState<string | null>(product?.image_url ?? null);
  const [variants, setVariants] = useState<VariantRow[]>(
    () =>
      product?.variants.map((v) => ({
        key: v.id,
        id: v.id,
        name: v.name,
        price: centsText(v.price_cents),
        is_available: v.is_available,
      })) ?? [],
  );
  const [groupIds, setGroupIds] = useState<string[]>(product?.addon_group_ids ?? []);

  // Images uploaded in this session but not (yet) saved: cleaned up when replaced or abandoned.
  const unsaved = useRef(new Set<string>());
  const initialImage = product?.image_url ?? null;

  // Pick up addon groups created in another tab (link below opens /painel/complementos).
  useEffect(() => {
    const onFocus = () => router.refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [router]);

  const backHref = `/painel/cardapio?${new URLSearchParams({
    ...(categories.find((c) => c.id === categoryId)?.menu_id
      ? { menu: categories.find((c) => c.id === categoryId)!.menu_id }
      : {}),
    ...(categoryId ? { categoria: categoryId } : {}),
  }).toString()}`;

  function changeImage(url: string | null) {
    if (imageUrl && imageUrl !== initialImage && unsaved.current.has(imageUrl)) {
      unsaved.current.delete(imageUrl);
      void discardUploadedImageAction(rid, imageUrl);
    }
    if (url && url !== initialImage) unsaved.current.add(url);
    setImageUrl(url);
  }

  function cancel() {
    for (const url of unsaved.current) void discardUploadedImageAction(rid, url);
    unsaved.current.clear();
    router.push(backHref);
  }

  function updateVariant(key: string, patch: Partial<VariantRow>) {
    setVariants((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function moveVariant(index: number, delta: number) {
    setVariants((rows) => {
      const next = [...rows];
      const target = index + delta;
      if (target < 0 || target >= next.length) return rows;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function toggleGroup(id: string, checked: boolean) {
    setGroupIds((ids) => (checked ? (ids.includes(id) ? ids : [...ids, id]) : ids.filter((x) => x !== id)));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const input: ProductInput = {
      name,
      description,
      category_id: categoryId,
      price,
      promo_price: promoPrice,
      is_available: available,
      stock,
      status,
      image_url: imageUrl,
      variants: variants.map((v) => ({ id: v.id, name: v.name, price: v.price, is_available: v.is_available })),
      addon_group_ids: groupIds.filter((id) => addonGroups.some((g) => g.id === id)),
    };
    const local = productSchema.safeParse(input);
    if (!local.success) {
      setErrors(fieldErrors(local.error));
      notify.error("Revise os campos destacados.");
      return;
    }
    setErrors({});
    startTransition(safely(async () => {
      const res = await saveProductAction(rid, product?.id ?? null, input);
      if (!res.ok) {
        setErrors({ ...(res.fieldErrors ?? {}), ...(res.error ? { _form: res.error } : {}) });
        notify.error(res.error ?? "Revise os campos destacados.");
        return;
      }
      unsaved.current.clear();
      notify.success(product ? "Item atualizado" : "Item criado");
      router.push(backHref);
    }));
  }

  const categoriesByMenu = menus
    .map((m) => ({ menu: m, categories: categories.filter((c) => c.menu_id === m.id) }))
    .filter((g) => g.categories.length > 0);

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="flex min-w-0 flex-col gap-5">
          <Card padding="lg" className="flex flex-col gap-4.5">
            <SectionTitle title="Informações" />
            <FormField label="Nome" htmlFor="product-name" error={errors.name} required>
              <Input value={name} maxLength={120} placeholder="Ex.: Nhoque ao sugo" onChange={(e) => setName(e.target.value)} />
            </FormField>
            <FormField
              label="Descrição"
              htmlFor="product-description"
              hint="Ingredientes, tamanho da porção, alergênicos."
              error={errors.description}
            >
              <Textarea value={description} maxLength={500} onChange={(e) => setDescription(e.target.value)} />
            </FormField>
            <FormField label="Categoria" htmlFor="product-category" error={errors.category_id} required>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categoriesByMenu.map(({ menu, categories: list }) => (
                    <SelectGroup key={menu.id}>
                      {categoriesByMenu.length > 1 && <SelectLabel>{menu.name}</SelectLabel>}
                      {list.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Preço (R$)" htmlFor="product-price" error={errors.price} required>
                <Input inputMode="decimal" placeholder="0,00" value={price} onChange={(e) => setPrice(e.target.value)} />
              </FormField>
              <FormField
                label="Preço promocional (R$)"
                htmlFor="product-promo"
                hint="Opcional. Menor que o preço."
                error={errors.promo_price}
              >
                <Input
                  inputMode="decimal"
                  placeholder="0,00"
                  value={promoPrice}
                  onChange={(e) => setPromoPrice(e.target.value)}
                />
              </FormField>
            </div>
          </Card>

          <Card padding="lg" className="flex flex-col gap-4">
            <SectionTitle
              title="Variações"
              description="Tamanhos ou versões. Com variações, o cliente escolhe uma e o preço dela substitui o preço do item."
            />
            {variants.length > 0 && (
              <ol className="flex flex-col gap-2.5">
                {variants.map((v, i) => (
                  <li
                    key={v.key}
                    className="flex flex-wrap items-start gap-2.5 rounded-xl border border-line bg-surface-subtle p-3 sm:flex-nowrap"
                  >
                    <FormField
                      label="Nome"
                      htmlFor={`variant-${v.key}-name`}
                      error={errors[`variants.${i}.name`]}
                      className="min-w-0 flex-[2_1_10rem]"
                    >
                      <Input
                        value={v.name}
                        maxLength={80}
                        placeholder="Ex.: Grande"
                        onChange={(e) => updateVariant(v.key, { name: e.target.value })}
                      />
                    </FormField>
                    <FormField
                      label="Preço (R$)"
                      htmlFor={`variant-${v.key}-price`}
                      error={errors[`variants.${i}.price`]}
                      className="min-w-0 flex-[1_1_7rem]"
                    >
                      <Input
                        inputMode="decimal"
                        placeholder="0,00"
                        value={v.price}
                        onChange={(e) => updateVariant(v.key, { price: e.target.value })}
                      />
                    </FormField>
                    <div className="flex items-center gap-1.5 self-end pb-0.5 sm:pb-0">
                      <IconButton
                        label="Mover para cima"
                        icon={ArrowUp}
                        size={34}
                        variant="outline"
                        disabled={i === 0}
                        onClick={() => moveVariant(i, -1)}
                      />
                      <IconButton
                        label="Mover para baixo"
                        icon={ArrowDown}
                        size={34}
                        variant="outline"
                        disabled={i === variants.length - 1}
                        onClick={() => moveVariant(i, 1)}
                      />
                      <IconButton
                        label="Remover variação"
                        icon={X}
                        size={34}
                        variant="outline"
                        className="text-danger"
                        onClick={() => setVariants((rows) => rows.filter((r) => r.key !== v.key))}
                      />
                    </div>
                  </li>
                ))}
              </ol>
            )}
            <button
              type="button"
              onClick={() =>
                setVariants((rows) => [...rows, { key: newKey(), name: "", price: price, is_available: true }])
              }
              className={cn(
                "rounded-lg border border-dashed border-line-strong px-3.5 py-2.75 text-body-sm font-bold text-ink-muted",
                "transition-[border-color,background-color,color] duration-150 ease-out hover:border-brand-tint-border hover:bg-brand-tint hover:text-brand",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
              )}
            >
              + Variação
            </button>
          </Card>

          <Card padding="lg" className="flex flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <SectionTitle title="Grupos de complementos" description="Adicionais, molhos e escolhas oferecidos com este item." />
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => router.refresh()}>
                  <RefreshCw size={14} strokeWidth={1.8} aria-hidden="true" />
                  Atualizar
                </Button>
                <Button variant="soft" size="sm" asChild>
                  <Link href="/painel/complementos?novo=1" target="_blank" rel="noopener">
                    <Plus size={14} strokeWidth={2.1} aria-hidden="true" />
                    Criar grupo
                    <ExternalLink size={14} strokeWidth={1.8} aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </div>
            {addonGroups.length === 0 ? (
              <p className="text-body-sm font-normal text-ink-muted">
                Nenhum grupo criado ainda. Crie grupos em Complementos e vincule-os aqui.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {addonGroups.map((g) => {
                  const checked = groupIds.includes(g.id);
                  const id = `group-${g.id}`;
                  return (
                    <li key={g.id}>
                      <label
                        htmlFor={id}
                        className={cn(
                          "flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 transition-[border-color,background-color] duration-150 ease-out",
                          checked ? "border-accent bg-brand-tint" : "border-line hover:border-line-strong",
                        )}
                      >
                        <Checkbox
                          id={id}
                          checked={checked}
                          onCheckedChange={(v) => toggleGroup(g.id, v === true)}
                          className="mt-0.5"
                        />
                        <span className="flex min-w-0 flex-1 flex-col gap-1">
                          <span className="text-body text-ink">{g.name}</span>
                          <span className="text-caption text-ink-muted">{groupSummary(g)}</span>
                          {g.options.length > 0 && (
                            <span className="truncate text-caption text-ink-subtle">
                              {g.options
                                .slice(0, 4)
                                .map((o) => (o.price_cents ? `${o.name} ${formatMoney(o.price_cents)}` : o.name))
                                .join(" · ")}
                              {g.options.length > 4 ? " …" : ""}
                            </span>
                          )}
                        </span>
                        {checked && groupIds.length > 1 && (
                          <span className="text-micro font-extrabold text-brand">{groupIds.indexOf(g.id) + 1}º</span>
                        )}
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <Card padding="lg" className="flex flex-col gap-4">
            <SectionTitle title="Foto" />
            <ImageUpload restaurantId={restaurantId} value={imageUrl} onChange={changeImage} error={errors.image_url} />
          </Card>

          <Card padding="lg" className="flex flex-col gap-4.5">
            <SectionTitle title="Disponibilidade" />
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="product-available" className="flex flex-col gap-0.5">
                <span className="text-body text-ink">Disponível para pedidos</span>
                <span className="text-caption text-ink-muted">Desligue para pausar sem tirar do cardápio.</span>
              </label>
              <Switch id="product-available" checked={available} onCheckedChange={setAvailable} />
            </div>
            <FormField
              label="Estoque"
              htmlFor="product-stock"
              hint="Deixe vazio para ilimitado. Baixa automática a cada pedido."
              error={errors.stock}
            >
              <Input inputMode="numeric" placeholder="Ilimitado" value={stock} onChange={(e) => setStock(e.target.value)} />
            </FormField>
            <div className="flex flex-col gap-2">
              <span className="text-body-sm font-bold text-ink">Status</span>
              <SegmentedControl
                aria-label="Status do item"
                block
                value={status}
                onChange={setStatus}
                options={[
                  { value: "ACTIVE", label: "Ativo" },
                  { value: "ARCHIVED", label: "Arquivado" },
                ]}
              />
              <p className="text-caption text-ink-muted">Itens arquivados somem do cardápio público.</p>
            </div>
          </Card>
        </div>
      </div>

      {errors._form && (
        <p role="alert" className="text-body-sm font-semibold text-danger">
          {errors._form}
        </p>
      )}

      <div className="sticky bottom-4 z-20 flex items-center gap-2 rounded-4xl border border-frame bg-surface p-3 shadow-card">
        {product && (
          <Button
            variant="ghost"
            className="px-3 text-danger sm:px-4"
            aria-label="Excluir item"
            disabled={pending}
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 size={16} strokeWidth={1.8} aria-hidden="true" />
            <span className="hidden sm:inline">Excluir</span>
          </Button>
        )}
        <div className="ml-auto flex min-w-0 items-center gap-2">
          <Button variant="outline" disabled={pending} onClick={cancel}>
            Cancelar
          </Button>
          <Button type="submit" loading={pending}>
            {product ? (
              <>
                Salvar<span className="hidden sm:inline"> alterações</span>
              </>
            ) : (
              "Criar item"
            )}
          </Button>
        </div>
      </div>

      {product && (
        <ConfirmationDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          tone="danger"
          title="Excluir item?"
          description={`"${product.name}" será removido do cardápio. Pedidos antigos continuam no histórico.`}
          confirmLabel="Excluir item"
          onConfirm={async () => {
            const res = await deleteProductAction(rid, product.id);
            if (!res.ok) {
              notify.error(res.error ?? "Não foi possível excluir.");
              throw new Error("delete failed");
            }
            notify.success("Item excluído");
            router.push(backHref);
          }}
        />
      )}
    </form>
  );
}
