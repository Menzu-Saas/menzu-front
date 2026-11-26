import { zonedParts } from "@/lib/dashboard";

/** Calendar days between two instants in the restaurant timezone (`later` day − `earlier` day). */
export function calendarDaysBetween(earlier: Date, later: Date, timeZone: string): number {
  const a = zonedParts(earlier, timeZone);
  const b = zonedParts(later, timeZone);
  return Math.round((Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day)) / 86_400_000);
}

/** "Última compra" label: hoje, ontem, há 3 dias, há 2 semanas, há 4 meses, há 1 ano. */
export function formatLastPurchase(iso: string | null, now: Date, timeZone: string): string {
  if (!iso) return "Nunca";
  const days = calendarDaysBetween(new Date(iso), now, timeZone);
  if (days <= 0) return "Hoje";
  if (days === 1) return "Ontem";
  if (days < 14) return `Há ${days} dias`;
  if (days < 60) return `Há ${Math.floor(days / 7)} semanas`;
  if (days < 365) return `Há ${Math.floor(days / 30)} meses`;
  const years = Math.floor(days / 365);
  return years === 1 ? "Há 1 ano" : `Há ${years} anos`;
}

/** "12/09/2026 · 19:42" in the restaurant timezone. */
export function formatDateTime(iso: string, timeZone: string): string {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat("pt-BR", { timeZone, day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
  const time = new Intl.DateTimeFormat("pt-BR", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
  return `${date} · ${time}`;
}

/** "12/09/2026" in the restaurant timezone. */
export function formatDate(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone, day: "2-digit", month: "2-digit", year: "numeric" }).format(
    new Date(iso),
  );
}

/** Removes PostgREST filter syntax characters from a free-text search term. */
export function sanitizeSearch(raw: string | string[] | undefined): string {
  const s = Array.isArray(raw) ? raw[0] : raw;
  return (s ?? "").replace(/[,()*%\\:"']/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
}

export type CustomerSearch = { kind: "phone"; digits: string } | { kind: "name"; term: string } | null;

/**
 * Customer search term → filter. Anything made only of digits and phone punctuation
 * ("(11) 98765-4321", "+55 11 98765-4321", "98765 4321") searches the stored phone digits
 * (country code 55 dropped); anything else searches the name.
 */
export function customerSearch(raw: string | string[] | undefined): CustomerSearch {
  const s = (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? "";
  if (!s) return null;
  if (/^[\d\s()+.\-]+$/.test(s)) {
    let digits = s.replace(/\D/g, "");
    if (/^\+?\s*55/.test(s) && digits.length >= 12) digits = digits.slice(2);
    if (digits) return { kind: "phone", digits: digits.slice(0, 13) };
  }
  const term = sanitizeSearch(s);
  return term ? { kind: "name", term } : null;
}
