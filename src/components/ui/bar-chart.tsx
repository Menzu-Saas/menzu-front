import { cn } from "@/lib/cn";

export interface BarDatum {
  label: string;
  value: number;
}

export interface BarChartProps {
  data: BarDatum[];
  /** Minimum total height in px (bars + labels). Default 150, as in the reference; grows with `flex-1`. */
  height?: number;
  formatValue?: (value: number) => string;
  /** Prefix of the accessible summary, e.g. "Vendas por hora". */
  label?: string;
  className?: string;
}

const RAMP = ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5", "bg-chart-6"] as const;

/**
 * Colour level by rank (reference "Vendas por hora"): highest = chart-6, next chart-5 … lowest chart-1.
 * Equal values share a level; with more than 6 bars ranks are bucketed evenly; zero is always chart-1.
 */
export function rankLevels(values: number[]): number[] {
  const distinct = [...new Set(values)].sort((a, b) => b - a);
  const n = distinct.length;
  return values.map((v) => {
    if (v <= 0) return 0;
    const rank = distinct.indexOf(v);
    return n <= RAMP.length ? RAMP.length - 1 - rank : RAMP.length - 1 - Math.floor((rank * RAMP.length) / n);
  });
}

/** Vertical bars coloured by rank, rounded 8/8/3/3, 11px faint labels, hover shows the value. */
export function BarChart({ data, height = 150, formatValue = String, label, className }: BarChartProps) {
  const max = Math.max(0, ...data.map((d) => d.value));
  const levels = rankLevels(data.map((d) => d.value));
  const summary = data.map((d) => `${d.label}: ${formatValue(d.value)}`).join(", ");

  return (
    <div
      role="img"
      aria-label={label ? `${label}. ${summary}` : summary}
      className={cn("flex items-stretch gap-3", className)}
      style={{ minHeight: height }}
    >
      {data.map((d, i) => {
        const pct = max > 0 ? Math.max((d.value / max) * 100, d.value > 0 ? 3 : 0) : 0;
        return (
          <div key={`${d.label}-${i}`} className="group flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="relative flex min-h-0 flex-1 items-end">
              <div
                data-bar=""
                className={cn(
                  "relative w-full rounded-bar transition-[filter] duration-150 ease-out group-hover:brightness-95",
                  RAMP[levels[i]],
                )}
                style={{ height: `${pct}%` }}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "pointer-events-none absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 rounded-sm bg-inverse px-2 py-1",
                    "text-micro whitespace-nowrap text-white opacity-0 transition-opacity duration-150 ease-out group-hover:opacity-100",
                  )}
                >
                  {formatValue(d.value)}
                </span>
              </div>
            </div>
            <span aria-hidden="true" className="truncate text-center text-micro font-normal text-ink-faint">
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
