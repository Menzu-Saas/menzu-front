"use client";

import { ArrowDown, ArrowUp, ChevronsUpDown, Inbox } from "lucide-react";
import {
  useMemo,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";
import { EmptyState } from "./empty-state";
import { Icon } from "./icon";
import { Pagination } from "./pagination";
import { Skeleton } from "./skeleton";
import { TBody, TCell, THead, THeadCell, TRow, Table } from "./table";

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
  sortable?: boolean;
  /** Value used for sorting; defaults to `row[key]`. */
  sortValue?: (row: T) => string | number | null | undefined;
  /** Hide the label in the stacked mobile card (e.g. action columns). */
  hideLabelOnMobile?: boolean;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  empty?: ReactNode;
  onRowClick?: (row: T) => void;
  /** Accessible name of the full-card button on mobile (e.g. "Abrir pedido #4821"). */
  getRowLabel?: (row: T) => string;
  loading?: boolean;
  /** Accessible name of the table. */
  caption?: string;
  className?: string;
  /** Zero delegates pagination to the containing view. */
  pageSize?: number;
}

type SortState = { key: string; dir: "asc" | "desc" } | null;

const collator = new Intl.Collator("pt-BR", {
  numeric: true,
  sensitivity: "base",
});

/** Empty values always sort last; `dir` (1 | -1) inverts only the non-empty comparison. */
function compare(a: unknown, b: unknown, dir: 1 | -1): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  const base =
    typeof a === "number" && typeof b === "number"
      ? a - b
      : collator.compare(String(a), String(b));
  return base * dir;
}

/** Interactive cell content (actions) whose clicks must not trigger the row. */
const NESTED_INTERACTIVE =
  "a,button,input,select,textarea,label,[role=menuitem],[role=button],[data-row-action]";

function fromNestedInteractive(event: MouseEvent<HTMLElement>): boolean {
  const hit = (event.target as Element).closest(NESTED_INTERACTIVE);
  return (
    hit != null &&
    hit !== event.currentTarget &&
    event.currentTarget.contains(hit)
  );
}

/**
 * Data table with client-side sorting. ≥ md: table (eyebrow headers, line rows, sunken hover);
 * < md: stacked cards (radius 18, line border) with label/value pairs.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowId,
  empty,
  onRowClick,
  getRowLabel,
  loading = false,
  caption,
  className,
  pageSize = 20,
}: DataTableProps<T>) {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>(null);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return rows;
    const get =
      col.sortValue ?? ((row: T) => (row as Record<string, unknown>)[col.key]);
    const dir = sort.dir === "desc" ? -1 : 1;
    // Array.prototype.sort is stable: equal values keep their input order in both directions.
    return [...rows].sort((a, b) => compare(get(a), get(b), dir));
  }, [rows, columns, sort]);

  const currentPage = Math.min(page, Math.max(1, Math.ceil(sorted.length / (pageSize || sorted.length || 1))));
  const pageRows = pageSize > 0 ? sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize) : sorted;

  function toggleSort(key: string) {
    setPage(1);
    setSort((prev) =>
      prev?.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );
  }

  const rowKeyDown = (row: T) => (event: KeyboardEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onRowClick?.(row);
    }
  };

  if (!loading && rows.length === 0) {
    return (
      <div data-testid="data-table" className={className}>
        {empty ?? <EmptyState icon={Inbox} title="Nada por aqui ainda" />}
      </div>
    );
  }

  const skeletonRows = Array.from({ length: 3 }, (_, i) => i);

  return (
    <div
      data-testid="data-table"
      aria-busy={loading || undefined}
      className={className}
    >
      {/* ≥ md: table */}
      <div className="hidden md:block">
        <Table aria-label={caption}>
          <THead>
            <TRow>
              {columns.map((col) => {
                const active = sort?.key === col.key;
                return (
                  <THeadCell
                    key={col.key}
                    aria-sort={
                      active
                        ? sort.dir === "asc"
                          ? "ascending"
                          : "descending"
                        : undefined
                    }
                    className={col.className}
                  >
                    {col.sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key)}
                        className={cn(
                          "-mx-1 inline-flex items-center gap-1 rounded-sm px-1 uppercase transition-colors duration-150 ease-out",
                          "hover:text-ink-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                          active && "text-ink-secondary",
                        )}
                      >
                        {col.header}
                        <Icon
                          icon={
                            active
                              ? sort.dir === "asc"
                                ? ArrowUp
                                : ArrowDown
                              : ChevronsUpDown
                          }
                          size={16}
                          className={active ? "text-brand" : "text-ink-ghost"}
                        />
                      </button>
                    ) : (
                      col.header
                    )}
                  </THeadCell>
                );
              })}
            </TRow>
          </THead>
          <TBody>
            {loading
              ? skeletonRows.map((i) => (
                  <TRow key={i}>
                    {columns.map((col) => (
                      <TCell key={col.key}>
                        <Skeleton className="h-4 w-3/4" radius="sm" />
                      </TCell>
                    ))}
                  </TRow>
                ))
              : pageRows.map((row) => (
                  <TRow
                    key={getRowId(row)}
                    interactive={Boolean(onRowClick)}
                    {...(onRowClick
                      ? {
                          tabIndex: 0,
                          onClick: (event: MouseEvent<HTMLTableRowElement>) => {
                            if (!fromNestedInteractive(event)) onRowClick(row);
                          },
                          onKeyDown: rowKeyDown(row),
                        }
                      : {})}
                  >
                    {columns.map((col) => (
                      <TCell key={col.key} className={col.className}>
                        {col.cell(row)}
                      </TCell>
                    ))}
                  </TRow>
                ))}
          </TBody>
        </Table>
      </div>

      {/* < md: stacked cards */}
      <ul
        data-testid="data-table-cards"
        aria-label={caption}
        className="flex flex-col gap-2.5 md:hidden"
      >
        {loading
          ? skeletonRows.map((i) => (
              <li
                key={i}
                className="flex flex-col gap-2.5 rounded-3xl border border-line bg-surface p-4"
              >
                <Skeleton className="h-4 w-1/2" radius="sm" />
                <Skeleton className="h-4 w-3/4" radius="sm" />
              </li>
            ))
          : pageRows.map((row) => (
              <li
                key={getRowId(row)}
                className={cn(
                  "relative rounded-3xl border border-line bg-surface",
                  onRowClick &&
                    "transition-[border-color] duration-150 ease-out hover:border-line-strong",
                )}
              >
                {onRowClick && (
                  // Stretched button behind the content: real <button>, keyboard accessible, and it never wraps
                  // the cell content, so action elements inside cells stay separate controls.
                  <button
                    type="button"
                    aria-label={
                      getRowLabel ? getRowLabel(row) : "Abrir detalhes"
                    }
                    onClick={() => onRowClick(row)}
                    className={cn(
                      "absolute inset-0 z-0 cursor-pointer rounded-3xl",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                    )}
                  />
                )}
                <div
                  className={cn(
                    "relative z-10 flex flex-col gap-2 p-4",
                    // Let clicks on plain content fall through to the stretched button; actions stay clickable.
                    onRowClick &&
                      "pointer-events-none [&_:is(a,button,input,select,textarea,label,[role=menuitem],[role=button],[data-row-action])]:pointer-events-auto",
                  )}
                >
                  {columns.map((col) => (
                    <div
                      key={col.key}
                      className="flex min-w-0 items-center justify-between gap-3"
                    >
                      {!col.hideLabelOnMobile && (
                        <span className="text-micro font-extrabold tracking-wider uppercase text-ink-faint">
                          {col.header}
                        </span>
                      )}
                      <span
                        className={cn(
                          "min-w-0 text-body-sm text-ink",
                          col.hideLabelOnMobile ? "w-full" : "text-right",
                        )}
                      >
                        {col.cell(row)}
                      </span>
                    </div>
                  ))}
                </div>
              </li>
            ))}
      </ul>
      {!loading && pageSize > 0 && <Pagination page={currentPage} pageSize={pageSize} total={sorted.length} onChange={setPage} label={caption || "Tabela"} />}
    </div>
  );
}
