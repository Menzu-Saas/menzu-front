// Report periods in the restaurant timezone: presets (Hoje / 7 dias / 30 dias / Este mês) and a custom
// inclusive day range (?de=YYYY-MM-DD&ate=YYYY-MM-DD). Pure, shared by the page and the CSV export.
import { zonedMidnight, zonedParts } from "@/lib/dashboard";

export const REPORT_PRESETS = ["hoje", "7d", "30d", "mes"] as const;
export type ReportPreset = (typeof REPORT_PRESETS)[number];

export const REPORT_PRESET_LABEL: Record<ReportPreset, string> = {
  hoje: "Hoje",
  "7d": "7 dias",
  "30d": "30 dias",
  mes: "Este mês",
};

/** Longest custom range (dashboard_metrics accepts up to 400 days). */
export const MAX_REPORT_DAYS = 366;

export interface ReportRange {
  preset: ReportPreset | "custom";
  from: Date;
  /** Exclusive end (midnight after the last day). */
  to: Date;
  /** Inclusive local days, "YYYY-MM-DD". */
  fromDay: string;
  toDay: string;
  days: number;
  /** Custom range was invalid and the default preset is shown instead. */
  invalid?: boolean;
}

type Params = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const pad = (n: number) => String(n).padStart(2, "0");
const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

function dayString(y: number, m: number, d: number): string {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

function parseDay(value: string | undefined): { y: number; m: number; d: number } | null {
  const match = value?.match(DAY);
  if (!match) return null;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return { y, m, d };
}

const dayNumber = (p: { y: number; m: number; d: number }) => Date.UTC(p.y, p.m - 1, p.d) / 86_400_000;

function build(preset: ReportRange["preset"], a: { y: number; m: number; d: number }, b: { y: number; m: number; d: number }, timeZone: string): ReportRange {
  return {
    preset,
    from: zonedMidnight(a.y, a.m, a.d, timeZone),
    to: zonedMidnight(b.y, b.m, b.d + 1, timeZone),
    fromDay: dayString(a.y, a.m, a.d),
    toDay: dayString(b.y, b.m, b.d),
    days: dayNumber(b) - dayNumber(a) + 1,
  };
}

function presetRange(preset: ReportPreset, now: Date, timeZone: string): ReportRange {
  const t = zonedParts(now, timeZone);
  const today = { y: t.year, m: t.month, d: t.day };
  const back = (n: number) => {
    const dt = new Date(Date.UTC(t.year, t.month - 1, t.day - n));
    return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
  };
  if (preset === "hoje") return build(preset, today, today, timeZone);
  if (preset === "7d") return build(preset, back(6), today, timeZone);
  if (preset === "30d") return build(preset, back(29), today, timeZone);
  return build(preset, { y: t.year, m: t.month, d: 1 }, today, timeZone);
}

/** Range from the URL: `?periodo=` preset, or `?de=&ate=` custom days; defaults to 7 dias. */
export function parseReportRange(params: Params, now: Date, timeZone: string): ReportRange {
  const de = parseDay(first(params.de));
  const ate = parseDay(first(params.ate));
  if (first(params.de) || first(params.ate)) {
    const t = zonedParts(now, timeZone);
    const today = dayNumber({ y: t.year, m: t.month, d: t.day });
    if (de && ate && dayNumber(de) <= dayNumber(ate) && dayNumber(ate) <= today && dayNumber(ate) - dayNumber(de) < MAX_REPORT_DAYS) {
      return build("custom", de, ate, timeZone);
    }
    return { ...presetRange("7d", now, timeZone), invalid: true };
  }
  const p = first(params.periodo);
  const preset = (REPORT_PRESETS as readonly string[]).includes(p ?? "") ? (p as ReportPreset) : "7d";
  return presetRange(preset, now, timeZone);
}

/** Query string that reproduces the range (used by links such as the CSV export). */
export function rangeQuery(range: ReportRange): string {
  return range.preset === "custom" ? `de=${range.fromDay}&ate=${range.toDay}` : `periodo=${range.preset}`;
}

/** "12/09/2026" from "2026-09-12". */
export function formatDayBr(day: string): string {
  const [y, m, d] = day.split("-");
  return `${d}/${m}/${y}`;
}

/** Human label: "Hoje", "Últimos 7 dias", "Este mês", "12/09/2026 – 18/09/2026". */
export function rangeLabel(range: ReportRange): string {
  if (range.preset === "hoje") return "Hoje";
  if (range.preset === "7d") return "Últimos 7 dias";
  if (range.preset === "30d") return "Últimos 30 dias";
  if (range.preset === "mes") return "Este mês";
  return range.fromDay === range.toDay
    ? formatDayBr(range.fromDay)
    : `${formatDayBr(range.fromDay)} – ${formatDayBr(range.toDay)}`;
}

/** Share of `part` in `total` as a whole percentage (0 when total is 0). */
export function percentOf(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}
