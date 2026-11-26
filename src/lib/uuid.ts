// Strict RFC 4122 UUID check (versions 1-8, variant 10xx). Used before any id reaches a query or RPC so a
// malformed id is a clean "not found" instead of a Postgres cast error.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}
