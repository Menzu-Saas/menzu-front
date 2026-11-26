import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { ProductForm } from "@/components/menu-admin/product-form";
import { PageHeader } from "@/components/ui";
import { MENU_ROLES } from "@/lib/schemas/menu";
import { requireMember } from "@/server/auth";
import { getProductForEditor, listAddonGroups, listCategories, listMenus } from "@/server/queries/menu";

export const metadata: Metadata = { title: "Item do cardápio" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ categoria?: string | string[] }>;
};

export default async function ProductEditorPage({ params, searchParams }: Props) {
  const { restaurantId } = await requireMember(MENU_ROLES);
  const { id } = await params;
  const isNew = id === "novo";
  if (!isNew && !UUID.test(id)) notFound();

  const [menus, categories, addonGroups, product] = await Promise.all([
    listMenus(restaurantId),
    listCategories(restaurantId),
    listAddonGroups(restaurantId),
    isNew ? Promise.resolve(null) : getProductForEditor(restaurantId, id),
  ]);
  if (!isNew && !product) notFound();

  const wanted = (await searchParams).categoria;
  const wantedId = Array.isArray(wanted) ? wanted[0] : wanted;
  const defaultCategoryId = categories.find((c) => c.id === wantedId)?.id ?? null;
  const category = categories.find((c) => c.id === (product?.category_id ?? defaultCategoryId));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link
          href={category ? `/painel/cardapio?menu=${category.menu_id}&categoria=${category.id}` : "/painel/cardapio"}
          className="inline-flex w-fit items-center gap-1 text-body-sm font-bold text-ink-muted"
        >
          <ChevronLeft size={16} strokeWidth={1.8} aria-hidden="true" />
          {category ? category.name : "Cardápio"}
        </Link>
        <PageHeader
          eyebrow="Cardápio · Item"
          title={product ? product.name : "Novo item"}
          description={
            product ? "Edite preço, fotos, variações e complementos." : "Preencha os dados do item e salve para publicá-lo."
          }
        />
      </div>
      <ProductForm
        key={product?.id ?? "novo"}
        restaurantId={restaurantId}
        product={product}
        defaultCategoryId={defaultCategoryId}
        menus={menus}
        categories={categories}
        addonGroups={addonGroups}
      />
    </div>
  );
}
