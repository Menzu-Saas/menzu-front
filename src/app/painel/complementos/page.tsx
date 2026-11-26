import type { Metadata } from "next";
import Link from "next/link";
import { AddonLibrary } from "@/components/menu-admin/addon-library";
import { Button, PageHeader } from "@/components/ui";
import { MENU_ROLES } from "@/lib/schemas/menu";
import { requireMember } from "@/server/auth";
import { listAddonGroups } from "@/server/queries/menu";
import { isPreviewRestaurant, previewAddonGroups } from "@/lib/restaurant-preview";

export const metadata: Metadata = { title: "Complementos" };

type SearchParams = Promise<{ novo?: string | string[]; grupo?: string | string[] }>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function ComplementosPage({ searchParams }: { searchParams: SearchParams }) {
  const { restaurantId, restaurant } = await requireMember(MENU_ROLES);
  const params = await searchParams;
  const savedGroups = await listAddonGroups(restaurantId);
  const preview = savedGroups.length === 0 && isPreviewRestaurant(restaurant);
  const groups = preview ? previewAddonGroups : savedGroups;
  const openNew = one(params.novo) === "1";
  const focusId = one(params.grupo) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Painel · Cardápio"
        title="Complementos"
        description="Grupos de adicionais reutilizáveis: vincule o mesmo grupo a vários itens."
        actions={
          <Button asChild>
            <Link href="/painel/complementos?novo=1" scroll={false}>
              + Novo grupo
            </Link>
          </Button>
        }
      />
      {preview && <p className="text-caption text-ink-muted">Dados de demonstração · somente visualização</p>}
      <AddonLibrary key={`${openNew}-${focusId}`} groups={groups} openNew={openNew} focusId={focusId} />
    </div>
  );
}
