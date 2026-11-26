import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MANAGEMENT_ROLES } from "@/lib/roles";
import { QrActions } from "@/components/qrcodes/qr-actions";
import { QrImage } from "@/components/qrcodes/qr-image";
import { TablesManager } from "@/components/qrcodes/tables-manager";
import { CopyButton } from "@/components/team/copy-button";
import { Icon, PageHeader } from "@/components/ui";
import { displayUrl, menuUrl, qrSvg } from "@/lib/qr";
import { customerAppUrl } from "@/server/app-url";
import { requireMember } from "@/server/auth";
import { getRestaurantSettings, getRestaurantTables } from "@/server/queries/settings";

export const metadata: Metadata = { title: "QR Codes" };

/** QR Codes: menu QR (download / print) and one QR per table (`?table={n}`), with an A4 print sheet. */
export default async function QrCodesPage() {
  const { restaurantId } = await requireMember(MANAGEMENT_ROLES);
  const [restaurant, tables, origin] = await Promise.all([
    getRestaurantSettings(restaurantId),
    getRestaurantTables(restaurantId),
    customerAppUrl(),
  ]);
  if (!restaurant) notFound();

  const url = menuUrl(origin, restaurant.slug);
  const [svg, tableQrs] = await Promise.all([
    qrSvg(url),
    Promise.all(
      tables.map(async (t) => {
        const tableUrl = menuUrl(origin, restaurant.slug, t.number);
        return { ...t, url: tableUrl, svg: await qrSvg(tableUrl) };
      }),
    ),
  ]);

  return (
    <div className="flex flex-col gap-5.5">
      <PageHeader title="QR Codes" description="Imprima e cole nas mesas, no balcão e nas embalagens." />

      <section
        aria-labelledby="menu-qr-title"
        className="flex flex-col gap-5 rounded-4xl border border-line bg-surface p-5 sm:flex-row sm:items-center sm:p-6.5"
      >
        <div className="mx-auto w-full max-w-52 shrink-0 rounded-3xl border border-line bg-surface p-3 sm:mx-0 sm:w-52">
          <QrImage svg={svg} label={`QR Code do cardápio de ${restaurant.name}`} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-3.5">
          <div className="flex flex-col gap-1">
            <p className="eyebrow text-ink-subtle">Cardápio digital</p>
            <h2 id="menu-qr-title" className="text-title-md text-ink">
              {restaurant.name}
            </h2>
            <p className="text-body-sm font-normal text-ink-muted">
              Leva direto ao seu cardápio para pedidos de delivery e retirada.
            </p>
          </div>
          <div className="flex min-w-0 items-center gap-2 rounded-xl border border-line bg-surface-sunken px-3.5 py-2.5">
            <span className="min-w-0 flex-1 truncate font-mono text-body-sm text-ink-secondary" title={url}>
              {displayUrl(url)}
            </span>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              aria-label="Abrir cardápio em nova aba"
              className="inline-flex shrink-0 rounded-sm text-brand hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <Icon icon={ExternalLink} size={18} />
            </a>
          </div>
          <div className="flex flex-wrap gap-2">
            <CopyButton value={url} />
            <QrActions url={url} svg={svg} filename={`cardapio-${restaurant.slug}`} printHref="/painel/qrcodes/imprimir?so=cardapio" />
          </div>
        </div>
      </section>

      <TablesManager tables={tableQrs} slug={restaurant.slug} acceptsDineIn={restaurant.accepts_dine_in} />
    </div>
  );
}
