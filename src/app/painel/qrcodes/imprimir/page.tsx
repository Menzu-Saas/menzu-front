import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MANAGEMENT_ROLES } from "@/lib/roles";
import { PrintSheetControls } from "@/components/qrcodes/print-sheet-controls";
import { QrImage } from "@/components/qrcodes/qr-image";
import { displayUrl, menuUrl, qrSvg } from "@/lib/qr";
import { customerAppUrl } from "@/server/app-url";
import { requireMember } from "@/server/auth";
import { getRestaurantSettings, getRestaurantTables } from "@/server/queries/settings";

export const metadata: Metadata = { title: "Imprimir QR Codes" };

/** A4 portrait, 3 × 4 tiles per page; everything but the sheet is hidden on paper. */
const PRINT_CSS = `
@page { size: A4 portrait; margin: 10mm; }
@media print {
  html, body { background: var(--mz-surface) !important; }
  body :not(:has(.mz-qr-sheet)):not(.mz-qr-sheet):not(.mz-qr-sheet *) { display: none !important; }
  body :has(.mz-qr-sheet) {
    display: block !important; position: static !important; margin: 0 !important; padding: 0 !important;
    border: 0 !important; box-shadow: none !important; background: none !important; width: auto !important;
    max-width: none !important; min-height: 0 !important; height: auto !important; overflow: visible !important;
  }
  .mz-qr-sheet { display: grid !important; grid-template-columns: repeat(3, 1fr) !important; gap: 6mm !important;
    width: 190mm !important; margin: 0 !important; padding: 0 !important; border: 0 !important; box-shadow: none !important; }
  .mz-qr-tile { break-inside: avoid; page-break-inside: avoid; height: 62mm !important; }
  .mz-no-print { display: none !important; }
}
`;

interface Tile {
  key: string;
  title: string;
  subtitle: string;
  url: string;
  svg: string;
}

export default async function ImprimirQrCodesPage({
  searchParams,
}: {
  searchParams: Promise<{ so?: string; mesa?: string }>;
}) {
  const { restaurantId } = await requireMember(MANAGEMENT_ROLES);
  const [{ so, mesa }, restaurant, tables, origin] = await Promise.all([
    searchParams,
    getRestaurantSettings(restaurantId),
    getRestaurantTables(restaurantId),
    customerAppUrl(),
  ]);
  if (!restaurant) notFound();

  const onlyTable = mesa && /^\d{1,4}$/.test(mesa) ? Number(mesa) : null;
  const tiles: Tile[] = [];
  if (onlyTable == null) {
    const url = menuUrl(origin, restaurant.slug);
    tiles.push({ key: "menu", title: "Cardápio", subtitle: "Peça pelo celular", url, svg: await qrSvg(url) });
  }
  if (so !== "cardapio") {
    for (const t of tables) {
      if (onlyTable != null && t.number !== onlyTable) continue;
      const url = menuUrl(origin, restaurant.slug, t.number);
      tiles.push({ key: t.id, title: `Mesa ${t.number}`, subtitle: t.label && t.label !== `Mesa ${t.number}` ? t.label : "Aponte a câmera e peça", url, svg: await qrSvg(url) });
    }
  }
  if (tiles.length === 0) notFound();

  return (
    <div className="flex flex-col items-center gap-5 py-2">
      {/* Rendered in place (not hoisted), so the print rules unmount with this page. */}
      <style>{PRINT_CSS}</style>
      <PrintSheetControls count={tiles.length} />
      <div className="mz-qr-sheet grid w-full max-w-200 grid-cols-2 gap-3.5 rounded-3xl border border-line bg-surface p-4 sm:grid-cols-3 sm:p-6">
        {tiles.map((tile) => (
          <div
            key={tile.key}
            className="mz-qr-tile flex flex-col items-center gap-1.5 rounded-2xl border border-dashed border-line-strong p-3 text-center"
          >
            <p className="truncate text-caption font-bold text-ink-muted">{restaurant.name}</p>
            <p className="text-subheading text-ink">{tile.title}</p>
            <QrImage svg={tile.svg} label={`QR Code: ${tile.title}`} className="w-full max-w-36" />
            <p className="text-micro text-ink-secondary">{tile.subtitle}</p>
            <p className="w-full truncate font-mono text-micro font-normal text-ink-faint">{displayUrl(tile.url)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
