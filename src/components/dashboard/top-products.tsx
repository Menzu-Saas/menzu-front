import { ImagePlaceholder, Skeleton } from "@/components/ui";
import { formatMoneyShort } from "@/lib/dashboard";
import type { TopProduct } from "@/server/queries/dashboard";

const PANEL = "flex min-w-0 flex-[1_1_15rem] flex-col gap-3.5 rounded-4xl border border-line bg-surface p-5";

/** "Mais vendidos" (reference P1): 36px image r11, name 13/700, "N vendas" 11 muted, revenue 13/800. */
export function TopProducts({ products, limit = 5 }: { products: TopProduct[]; limit?: number }) {
  const list = products.slice(0, limit);
  return (
    <section aria-labelledby="top-products-title" className={PANEL}>
      <h2 id="top-products-title" className="text-item font-extrabold text-ink">
        Mais vendidos
      </h2>
      {list.length === 0 ? (
        <p className="py-6 text-center text-body-sm font-normal text-ink-muted">Nenhuma venda no período.</p>
      ) : (
        <ol className="flex flex-col gap-3.5">
          {list.map((p, i) => (
            <li key={p.product_id ?? `${p.name}-${i}`} className="flex items-center gap-2.5">
              {p.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- tenant uploads from Supabase Storage
                <img src={p.image_url} alt="" className="size-9 shrink-0 rounded-md object-cover" loading="lazy" />
              ) : (
                <ImagePlaceholder kind="food" className="size-9 shrink-0 rounded-md" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-body-sm font-bold text-ink">{p.name}</p>
                <p className="text-micro font-normal text-ink-muted">
                  {p.quantity} {p.quantity === 1 ? "venda" : "vendas"}
                </p>
              </div>
              <p className="shrink-0 text-body-sm font-extrabold tabular-nums text-ink">
                {formatMoneyShort(p.revenue_cents)}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function TopProductsSkeleton() {
  return (
    <div className={PANEL} aria-hidden="true">
      <Skeleton className="h-5 w-28" radius="sm" />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-2.5">
          <Skeleton className="size-9 shrink-0" radius="md" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-3.5 w-3/4" radius="sm" />
            <Skeleton className="h-3 w-1/3" radius="sm" />
          </div>
          <Skeleton className="h-3.5 w-12" radius="sm" />
        </div>
      ))}
    </div>
  );
}
