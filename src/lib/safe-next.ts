/**
 * Returns `value` when it is a same-origin absolute path ("/painel?x=1"), else null.
 * Guards every `?next=` redirect against open redirects ("//evil.com", "/\\evil.com", "https://…").
 */
export function safeNextPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return null;
  if (/[\u0000-\u001f]/.test(value)) return null;
  const pathname = value.split(/[?#]/)[0];
  const roots = ["/acessar", "/painel", "/cozinha", "/entregas", "/onboarding", "/convite", "/sem-restaurante", "/redefinir-senha"];
  if (!roots.some((root) => pathname === root || pathname.startsWith(root + "/"))) return null;
  return value;
}
