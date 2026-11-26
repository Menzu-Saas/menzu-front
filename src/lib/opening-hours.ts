// Opening-hours maths in the restaurant's time zone. Mirrors `menzu_is_open_at` (SQL):
// weekday 0 = Sunday; closes_at < opens_at crosses midnight; closing time is exclusive;
// a restaurant without opening-hours rows is closed.

export type OpeningHourInput = {
  weekday: number;
  opens_at: string; // "HH:MM" or "HH:MM:SS"
  closes_at: string;
};

type LocalParts = { year: number; month: number; day: number; hour: number; minute: number; second: number; weekday: number };

const formatters = new Map<string, Intl.DateTimeFormat>();
const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const DAY_MS = 86_400_000;
const SLOT_MS = 15 * 60_000;

function formatter(tz: string): Intl.DateTimeFormat {
  let f = formatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      weekday: "short",
    });
    formatters.set(tz, f);
  }
  return f;
}

/** Wall-clock parts of `date` in `tz`. */
export function localParts(date: Date, tz: string): LocalParts {
  const out: Record<string, string> = {};
  for (const p of formatter(tz).formatToParts(date)) out[p.type] = p.value;
  return {
    year: Number(out.year),
    month: Number(out.month),
    day: Number(out.day),
    hour: Number(out.hour) % 24,
    minute: Number(out.minute),
    second: Number(out.second),
    weekday: WEEKDAYS[out.weekday] ?? 0,
  };
}

function offsetMs(date: Date, tz: string): number {
  const p = localParts(date, tz);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(date.getTime() / 1000) * 1000;
}

/** Instant of a wall-clock time in `tz` (month 1-12; day may overflow, Date.UTC normalises it). */
export function zonedTime(year: number, month: number, day: number, seconds: number, tz: string): Date {
  const guess = Date.UTC(year, month - 1, day) + seconds * 1000;
  let at = guess - offsetMs(new Date(guess), tz);
  // Second pass settles DST transitions.
  at = guess - offsetMs(new Date(at), tz);
  return new Date(at);
}

function toSeconds(time: string): number {
  const [h = "0", m = "0", s = "0"] = time.split(":");
  return Number(h) * 3600 + Number(m) * 60 + Number(s);
}

type Interval = { start: number; end: number };

/** Concrete open intervals whose opening day lies in [fromDay, toDay] (offsets in days from `now`'s local date). */
function intervals(hours: OpeningHourInput[], tz: string, now: Date, fromDay: number, toDay: number): Interval[] {
  const p = localParts(now, tz);
  const out: Interval[] = [];
  for (let d = fromDay; d <= toDay; d++) {
    const weekday = (((p.weekday + d) % 7) + 7) % 7;
    for (const h of hours) {
      if (h.weekday !== weekday) continue;
      const opens = toSeconds(h.opens_at);
      const closes = toSeconds(h.closes_at);
      if (opens === closes) continue;
      const start = zonedTime(p.year, p.month, p.day + d, opens, tz).getTime();
      const end = zonedTime(p.year, p.month, p.day + d + (closes < opens ? 1 : 0), closes, tz).getTime();
      out.push({ start, end });
    }
  }
  return out.sort((a, b) => a.start - b.start);
}

export function isOpenNow(hours: OpeningHourInput[], tz: string, now: Date): boolean {
  if (!hours.length) return false;
  const t = now.getTime();
  return intervals(hours, tz, now, -1, 0).some((i) => t >= i.start && t < i.end);
}

/** Next instant (strictly after `now`) at which an opening interval starts; null without hours. */
export function nextOpening(hours: OpeningHourInput[], tz: string, now: Date): Date | null {
  const t = now.getTime();
  const next = intervals(hours, tz, now, 0, 8).find((i) => i.start > t);
  return next ? new Date(next.start) : null;
}

/**
 * End of the current opening period (back-to-back intervals, e.g. 00:00–23:59:59 every day, are
 * merged); null when closed. Search is bounded to 8 days.
 */
export function closingTime(hours: OpeningHourInput[], tz: string, now: Date): Date | null {
  const t = now.getTime();
  const all = intervals(hours, tz, now, -1, 8);
  const current = all.filter((i) => t >= i.start && t < i.end);
  if (!current.length) return null;
  let end = Math.max(...current.map((i) => i.end));
  let extended = true;
  while (extended) {
    extended = false;
    for (const i of all) {
      if (i.start <= end + 1000 && i.end > end) {
        end = i.end;
        extended = true;
      }
    }
  }
  return new Date(end);
}

/** "23h", "11h30". */
export function formatHourLabel(date: Date, tz: string): string {
  const p = localParts(date, tz);
  return p.minute ? `${p.hour}h${String(p.minute).padStart(2, "0")}` : `${p.hour}h`;
}

const pad = (n: number) => String(n).padStart(2, "0");

export type ScheduleSlot = {
  at: Date;
  /** ISO-8601 in UTC (the API requires an explicit offset). */
  iso: string;
  /** Local date key, "2026-10-05". */
  dateKey: string;
  /** "Hoje", "Amanhã" or "qua., 07/10". */
  dateLabel: string;
  /** Local "HH:MM". */
  timeLabel: string;
};

/**
 * Bookable 15-minute slots: at least `prepMinutes` from now, at most `days` days ahead, and
 * inside an opening interval.
 */
export function scheduleSlots(
  hours: OpeningHourInput[],
  tz: string,
  now: Date,
  prepMinutes: number,
  days = 7,
): ScheduleSlot[] {
  if (!hours.length) return [];
  const first = Math.ceil((now.getTime() + prepMinutes * 60_000) / SLOT_MS) * SLOT_MS;
  const last = now.getTime() + days * DAY_MS;
  const today = localParts(now, tz);
  const todayKey = `${today.year}-${pad(today.month)}-${pad(today.day)}`;
  const tomorrow = localParts(new Date(now.getTime() + DAY_MS), tz);
  const tomorrowKey = `${tomorrow.year}-${pad(tomorrow.month)}-${pad(tomorrow.day)}`;
  const weekdayFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: tz, weekday: "short" });
  const all = intervals(hours, tz, now, -1, days + 1);

  const slots: ScheduleSlot[] = [];
  for (let t = first; t <= last; t += SLOT_MS) {
    if (!all.some((i) => t >= i.start && t < i.end)) continue;
    const at = new Date(t);
    const p = localParts(at, tz);
    const dateKey = `${p.year}-${pad(p.month)}-${pad(p.day)}`;
    const dateLabel =
      dateKey === todayKey
        ? "Hoje"
        : dateKey === tomorrowKey
          ? "Amanhã"
          : `${weekdayFmt.format(at)}, ${pad(p.day)}/${pad(p.month)}`;
    slots.push({ at, iso: at.toISOString(), dateKey, dateLabel, timeLabel: `${pad(p.hour)}:${pad(p.minute)}` });
  }
  return slots;
}

export type OpenState =
  | { kind: "open"; label: string }
  | { kind: "closed"; label: string; canSchedule: boolean }
  | { kind: "paused"; label: string };

/**
 * Customer-facing availability: status PAUSED/CLOSED block ordering entirely (the database rejects
 * even scheduled orders); OPEN outside the hours only allows scheduling, if enabled.
 */
export function restaurantOpenState(
  r: { status: "OPEN" | "CLOSED" | "PAUSED"; acceptsScheduling: boolean },
  hours: OpeningHourInput[],
  tz: string,
  now: Date,
): OpenState {
  if (r.status === "PAUSED") return { kind: "paused", label: "Pausado" };
  const next = nextOpening(hours, tz, now);
  const opensLabel = next ? `abre ${sameLocalDay(next, now, tz) ? "" : weekdayShort(next, tz) + " "}${formatHourLabel(next, tz)}` : null;
  if (r.status === "CLOSED") return { kind: "closed", label: "Fechado", canSchedule: false };
  if (isOpenNow(hours, tz, now)) {
    const end = closingTime(hours, tz, now);
    if (!end || end.getTime() - now.getTime() > DAY_MS) return { kind: "open", label: "Aberto agora" };
    return { kind: "open", label: `Aberto até ${formatHourLabel(end, tz)}` };
  }
  return {
    kind: "closed",
    label: opensLabel ? `Fechado · ${opensLabel}` : "Fechado",
    canSchedule: r.acceptsScheduling && next != null,
  };
}

function sameLocalDay(a: Date, b: Date, tz: string): boolean {
  const pa = localParts(a, tz);
  const pb = localParts(b, tz);
  return pa.year === pb.year && pa.month === pb.month && pa.day === pb.day;
}

function weekdayShort(date: Date, tz: string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: tz, weekday: "short" }).format(date).replace(".", "");
}

/**
 * Date-aware schedule label, same day wording as the checkout slots: "hoje às 19:00",
 * "amanhã às 19:00" or "qui., 08/10 às 19:00".
 */
export function formatScheduled(iso: string | Date, tz: string, now: Date = new Date()): string {
  const at = typeof iso === "string" ? new Date(iso) : iso;
  const p = localParts(at, tz);
  const key = (x: LocalParts) => `${x.year}-${pad(x.month)}-${pad(x.day)}`;
  const k = key(p);
  const day =
    k === key(localParts(now, tz))
      ? "hoje"
      : k === key(localParts(new Date(now.getTime() + DAY_MS), tz))
        ? "amanhã"
        : `${new Intl.DateTimeFormat("pt-BR", { timeZone: tz, weekday: "short" }).format(at)}, ${pad(p.day)}/${pad(p.month)}`;
  return `${day} às ${pad(p.hour)}:${pad(p.minute)}`;
}

/** "19:42" in the restaurant time zone. */
export function formatClock(iso: string | Date, tz: string): string {
  const p = localParts(typeof iso === "string" ? new Date(iso) : iso, tz);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}
