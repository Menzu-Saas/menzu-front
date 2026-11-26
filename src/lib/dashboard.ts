// Pure helpers for the admin dashboard: periods in the restaurant timezone, greeting, deltas and
// short money. No server or React imports so they can be unit-tested and shared.
import type { MetricDeltaTone } from "@/components/ui/metric-card";

export const DASHBOARD_PERIODS = ["hoje", "7d", "30d"] as const;
export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number];

export const PERIOD_DAYS: Record<DashboardPeriod, number> = { hoje: 1, "7d": 7, "30d": 30 };

export const PERIOD_LABEL: Record<DashboardPeriod, string> = { hoje: "Hoje", "7d": "7 dias", "30d": "30 dias" };

/** Comparison suffix shown under each metric ("+18% vs ontem"). */
export const PERIOD_COMPARISON: Record<DashboardPeriod, string> = {
  hoje: "vs ontem",
  "7d": "vs 7 dias anteriores",
  "30d": "vs 30 dias anteriores",
};

export function parsePeriod(value: string | string[] | undefined): DashboardPeriod {
  const v = Array.isArray(value) ? value[0] : value;
  return (DASHBOARD_PERIODS as readonly string[]).includes(v ?? "") ? (v as DashboardPeriod) : "7d";
}

export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  /** 0 = Sunday … 6 = Saturday (same as opening_hours.weekday). */
  weekday: number;
}

const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const partsFormatters = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = partsFormatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      weekday: "short",
      hourCycle: "h23",
    });
    partsFormatters.set(timeZone, f);
  }
  return f;
}

/** Wall-clock parts of `date` in `timeZone`. */
export function zonedParts(date: Date, timeZone: string): ZonedParts {
  const map: Record<string, string> = {};
  for (const p of partsFormatter(timeZone).formatToParts(date)) map[p.type] = p.value;
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour) % 24,
    minute: Number(map.minute),
    weekday: WEEKDAY_INDEX[map.weekday] ?? 0,
  };
}

/** Offset (ms) of `timeZone` from UTC at instant `date` (e.g. -3h for São Paulo). */
function offsetMs(date: Date, timeZone: string): number {
  const p = zonedParts(date, timeZone);
  const seconds = date.getUTCSeconds();
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, seconds);
  return asUtc - (date.getTime() - date.getUTCMilliseconds());
}

/** Instant of local midnight of year/month/day (day may overflow, e.g. day 0 = last day of previous month). */
export function zonedMidnight(year: number, month: number, day: number, timeZone: string): Date {
  const guess = Date.UTC(year, month - 1, day);
  const first = guess - offsetMs(new Date(guess), timeZone);
  const second = guess - offsetMs(new Date(first), timeZone);
  return new Date(second);
}

export interface PeriodRange {
  from: Date;
  to: Date;
  /** Previous window of the same elapsed length, so "today until now" compares with "yesterday until this time". */
  prevFrom: Date;
  prevTo: Date;
}

/** Current period = the last N local days including today (until tomorrow's midnight). */
export function periodRange(period: DashboardPeriod, now: Date, timeZone: string): PeriodRange {
  const days = PERIOD_DAYS[period];
  const { year, month, day } = zonedParts(now, timeZone);
  const from = zonedMidnight(year, month, day - (days - 1), timeZone);
  const to = zonedMidnight(year, month, day + 1, timeZone);
  const prevFrom = zonedMidnight(year, month, day - (2 * days - 1), timeZone);
  const elapsed = Math.max(0, Math.min(now.getTime(), to.getTime()) - from.getTime());
  return { from, to, prevFrom, prevTo: new Date(prevFrom.getTime() + elapsed) };
}

/** "Bom dia" 5–11h, "Boa tarde" 12–17h, "Boa noite" otherwise. */
export function greetingFor(hour: number): string {
  if (hour >= 5 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 18) return "Boa tarde";
  return "Boa noite";
}

/** First word of a full name; falls back to the e-mail local part. */
export function firstName(fullName: string | null | undefined, email?: string | null): string {
  const name = fullName?.trim().split(/\s+/)[0];
  if (name) return name;
  const local = email?.split("@")[0]?.trim();
  return local ? local.charAt(0).toUpperCase() + local.slice(1) : "";
}

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const MONTHS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

/** "Terça, 9 de setembro" in the restaurant timezone. */
export function formatDayLine(date: Date, timeZone: string): string {
  const p = zonedParts(date, timeZone);
  return `${WEEKDAYS[p.weekday]}, ${p.day} de ${MONTHS[p.month - 1]}`;
}

export const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const reais = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

/** Whole reais for compact dashboard figures: 412800 → "R$ 4.128" (reference P1). */
export function formatMoneyShort(cents: number): string {
  return `R$ ${reais.format(Math.round(cents / 100))}`;
}

export interface MetricDelta {
  text: string;
  tone: MetricDeltaTone;
}

/** Percentage change ("+18% vs ontem"); "estável" under 1%; no base → neutral "sem dados anteriores". */
export function percentDelta(current: number, previous: number, suffix: string): MetricDelta {
  if (previous <= 0) {
    return current > 0 ? { text: "sem dados anteriores", tone: "neutral" } : { text: "estável", tone: "neutral" };
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return { text: "estável", tone: "neutral" };
  return { text: `${pct > 0 ? "+" : "−"}${Math.abs(pct)}% ${suffix}`, tone: pct > 0 ? "up" : "down" };
}

/** Absolute change in a count ("+11 vs ontem"). */
export function countDelta(current: number, previous: number, suffix: string): MetricDelta {
  const diff = current - previous;
  if (diff === 0) return { text: "estável", tone: "neutral" };
  return { text: `${diff > 0 ? "+" : "−"}${Math.abs(diff)} ${suffix}`, tone: diff > 0 ? "up" : "down" };
}

/** Prep-time change: slower is a warning (brand orange, as in the reference "+3 min"), faster is good. */
export function minutesDelta(current: number, previous: number): MetricDelta {
  if (current <= 0 || previous <= 0) return { text: "sem dados anteriores", tone: "neutral" };
  const diff = current - previous;
  if (diff === 0) return { text: "estável", tone: "neutral" };
  return diff > 0 ? { text: `+${diff} min`, tone: "warn" } : { text: `−${Math.abs(diff)} min`, tone: "up" };
}

export interface OpeningWindow {
  weekday: number;
  opens_at: string;
  closes_at: string;
}

export interface StoreHoursInfo {
  /** Inside an opening window right now. Same rules as `menzu_is_open_at`: no hours means closed. */
  withinHours: boolean;
  /** Line under the status title, e.g. "Fecha às 23:00", "Abre amanhã às 11:00". */
  detail: string | null;
}

const hhmm = (t: string) => t.slice(0, 5);
const toMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const isAllDay = (w: OpeningWindow) => toMinutes(w.opens_at) === 0 && toMinutes(w.closes_at) >= 23 * 60 + 59;

export const NO_HOURS_DETAIL = "Sem horários — a loja não recebe pedidos";

/** Is the store inside its opening hours now, and the matching "Fecha às / Abre às" line. */
export function storeHoursInfo(all: OpeningWindow[], now: Date, timeZone: string): StoreHoursInfo {
  // Like the database, an interval that opens and closes at the same time is never open.
  const hours = all.filter((h) => toMinutes(h.opens_at) !== toMinutes(h.closes_at));
  if (hours.length === 0) return { withinHours: false, detail: NO_HOURS_DETAIL };
  const p = zonedParts(now, timeZone);
  const minute = p.hour * 60 + p.minute;
  const yesterday = (p.weekday + 6) % 7;

  for (const w of hours.filter((h) => h.weekday === p.weekday)) {
    const open = toMinutes(w.opens_at);
    const close = toMinutes(w.closes_at);
    const crosses = close < open;
    if (minute >= open && (crosses || minute < close)) {
      if (isAllDay(w)) return { withinHours: true, detail: "Aberta 24 horas" };
      return { withinHours: true, detail: `Fecha às ${hhmm(w.closes_at)}` };
    }
  }
  for (const w of hours.filter((h) => h.weekday === yesterday)) {
    const open = toMinutes(w.opens_at);
    const close = toMinutes(w.closes_at);
    if (close < open && minute < close) return { withinHours: true, detail: `Fecha às ${hhmm(w.closes_at)}` };
  }

  const later = hours
    .filter((h) => h.weekday === p.weekday && toMinutes(h.opens_at) > minute)
    .sort((a, b) => toMinutes(a.opens_at) - toMinutes(b.opens_at))[0];
  if (later) return { withinHours: false, detail: `Abre às ${hhmm(later.opens_at)}` };
  for (let i = 1; i <= 7; i++) {
    const wd = (p.weekday + i) % 7;
    const next = hours.filter((h) => h.weekday === wd).sort((a, b) => toMinutes(a.opens_at) - toMinutes(b.opens_at))[0];
    if (next) {
      const when = i === 1 ? "amanhã" : WEEKDAYS[wd].toLowerCase();
      return { withinHours: false, detail: `Abre ${when} às ${hhmm(next.opens_at)}` };
    }
  }
  return { withinHours: false, detail: null };
}
