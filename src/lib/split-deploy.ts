/**
 * O front (este código, na Vercel) e a API (repositório menzu-api, no Render) são publicados separados.
 * Com `MENZU_API_ORIGIN`, todo pedido a /api/* é repassado à API. O navegador continua falando com um
 * endereço só, então o login e o cookie do comprovante continuam funcionando.
 */
type Env = Record<string, string | undefined>;

/** Endereço da API, ou null. Aceita só a origem https (http apenas em localhost). */
export function apiOrigin(env: Env = process.env): string | null {
  const raw = env.MENZU_API_ORIGIN?.trim();
  if (!raw) return null;
  let url: URL;
  try { url = new URL(raw); } catch { throw new Error("MENZU_API_ORIGIN inválido."); }
  const loopback = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if ((url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) || url.username || url.password
    || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("MENZU_API_ORIGIN deve ser só o endereço https da API, sem caminho.");
  }
  return url.origin;
}

/** Variáveis sem as quais o site publicado quebra. Na Vercel o build falha com a lista do que falta. */
export function missingDeployVariables(env: Env = process.env): string[] {
  return ["MENZU_API_ORIGIN", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"].filter((name) => !env[name]?.trim());
}
