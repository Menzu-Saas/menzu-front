// Converters between admin form fields (strings) and payload values.
import { localParts, zonedTime } from "@/lib/opening-hours";

/** 2590 → "25,90"; 0/null → "" (empty field). */
export function centsToInput(cents: number | null | undefined): string {
  return cents ? (cents / 100).toFixed(2).replace(".", ",") : "";
}

/** "" → null, "12" → 12, "abc"/"1.5" → NaN (left for the schema to reject). */
export function intOrNull(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  return /^-?\d+$/.test(s) ? Number(s) : Number.NaN;
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * ISO instant → `datetime-local` value as wall-clock time in the restaurant's `timeZone`
 * ("2026-10-05T19:30"). The browser's own timezone is never used.
 */
export function isoToLocalInput(iso: string | null | undefined, timeZone: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = localParts(d, timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

const LOCAL_INPUT = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

/**
 * `datetime-local` value read as wall-clock time in the restaurant's `timeZone` → ISO instant (UTC);
 * "" → null; malformed → "invalid" (left for the schema to reject).
 */
export function localInputToIso(value: string, timeZone: string): string | null {
  if (!value) return null;
  const m = LOCAL_INPUT.exec(value);
  if (!m) return "invalid";
  const [, y, mo, d, h, mi, s = "0"] = m;
  const month = Number(mo);
  const day = Number(d);
  if (month < 1 || month > 12 || day < 1 || day > 31 || Number(h) > 23 || Number(mi) > 59) return "invalid";
  const at = zonedTime(Number(y), month, day, Number(h) * 3600 + Number(mi) * 60 + Number(s), timeZone);
  return Number.isNaN(at.getTime()) ? "invalid" : at.toISOString();
}
