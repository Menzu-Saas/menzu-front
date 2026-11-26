"use client";

import { Search, Users, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { DataTable, EmptyState, Input, type DataTableColumn } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { CustomerDrawer } from "./customer-drawer";

export interface CustomerRow {
  id: string;
  name: string;
  phone: string;
  orders_count: number;
  total_spent_cents: number;
  avg_ticket_cents: number;
  last_order_at: string | null;
  /** Pre-computed on the server in the restaurant timezone ("Há 3 dias"). */
  last_order_label: string;
}

const COLUMNS: DataTableColumn<CustomerRow>[] = [
  {
    key: "name",
    header: "Nome",
    sortable: true,
    cell: (c) => <span className="font-bold text-ink">{c.name}</span>,
  },
  {
    key: "phone",
    header: "Telefone",
    cell: (c) => <span className="whitespace-nowrap text-ink-secondary">{formatPhone(c.phone)}</span>,
  },
  {
    key: "orders_count",
    header: "Pedidos",
    sortable: true,
    className: "md:text-right",
    cell: (c) => <span className="font-bold tabular-nums">{c.orders_count}</span>,
  },
  {
    key: "total_spent_cents",
    header: "Total gasto",
    sortable: true,
    className: "md:text-right",
    cell: (c) => <span className="whitespace-nowrap font-extrabold tabular-nums">{formatMoney(c.total_spent_cents)}</span>,
  },
  {
    key: "avg_ticket_cents",
    header: "Ticket médio",
    sortable: true,
    className: "md:text-right",
    cell: (c) => <span className="whitespace-nowrap tabular-nums text-ink-secondary">{formatMoney(c.avg_ticket_cents)}</span>,
  },
  {
    key: "last_order_at",
    header: "Última compra",
    sortable: true,
    sortValue: (c) => (c.last_order_at ? new Date(c.last_order_at).getTime() : null),
    cell: (c) => <span className="whitespace-nowrap text-ink-muted">{c.last_order_label}</span>,
  },
];

export function CustomersView({
  rows,
  query,
  timeZone,
  truncated,
}: {
  rows: CustomerRow[];
  query: string;
  timeZone: string;
  truncated: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [term, setTerm] = useState(query);
  const [pending, startTransition] = useTransition();
  const [openId, setOpenId] = useState<string | null>(null);
  const lastPushed = useRef(query);

  // Debounced URL search (?q=), so results are server-filtered and survive reloads.
  useEffect(() => {
    const next = term.trim();
    if (next === lastPushed.current) return;
    const timer = setTimeout(() => {
      lastPushed.current = next;
      startTransition(() => {
        router.replace(next ? `${pathname}?q=${encodeURIComponent(next)}` : pathname, { scroll: false });
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [term, pathname, router]);

  const selected = rows.find((r) => r.id === openId) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <form role="search" onSubmit={(e) => e.preventDefault()} className="w-full max-w-110">
        <label htmlFor="customer-search" className="sr-only">
          Buscar cliente por nome ou telefone
        </label>
        <Input
          id="customer-search"
          type="search"
          leftIcon={Search}
          placeholder="Buscar por nome ou telefone"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          autoComplete="off"
          enterKeyHint="search"
          className="[&::-webkit-search-cancel-button]:hidden"
          rightSlot={
            term ? (
              <button
                type="button"
                onClick={() => setTerm("")}
                aria-label="Limpar busca"
                className="inline-flex size-6 items-center justify-center rounded-full text-ink-faint hover:text-ink"
              >
                <X size={16} strokeWidth={1.8} aria-hidden="true" />
              </button>
            ) : null
          }
        />
      </form>

      <div className={cn("transition-opacity duration-150 ease-out", pending && "opacity-60")} aria-busy={pending || undefined}>
        <DataTable
          caption="Clientes"
          columns={COLUMNS}
          rows={rows}
          getRowId={(c) => c.id}
          onRowClick={(c) => { if (!c.id.startsWith("preview:")) setOpenId(c.id); }}
          getRowLabel={(c) => `Abrir cliente ${c.name}`}
          empty={
            <EmptyState
              icon={Users}
              title={query ? "Nenhum cliente encontrado" : "Nenhum cliente ainda"}
              description={
                query
                  ? "Confira o nome ou o telefone digitado."
                  : "Os clientes aparecem aqui assim que fizerem o primeiro pedido."
              }
            />
          }
        />
        {truncated && (
          <p className="mt-3 text-caption text-ink-muted">
            Mostrando os {rows.length} clientes mais recentes. Use a busca para encontrar os demais.
          </p>
        )}
      </div>

      <CustomerDrawer
        customerId={openId}
        fallbackName={selected?.name}
        timeZone={timeZone}
        onOpenChange={(open) => !open && setOpenId(null)}
      />
    </div>
  );
}
