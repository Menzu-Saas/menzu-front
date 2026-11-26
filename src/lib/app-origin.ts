/**
 * Public origin for links that leave the app (e-mail links, invite links, QR codes).
 *
 * `APP_URL` is the only trusted source in production: falling back to the request's
 * Host / X-Forwarded-Host there would let a forged header plant a foreign origin in e-mails and
 * printed QR codes. Outside production the request host is an acceptable convenience.
 */
export interface AppOriginInput {
  configured: string | undefined;
  nodeEnv: string | undefined;
  header: (name: string) => string | null;
}

/**
 * Endereço público configurado: APP_URL; na Vercel, se ela faltar, o domínio de produção que a própria
 * plataforma informa (VERCEL_PROJECT_PRODUCTION_URL). Nenhum dos dois vem do pedido do visitante.
 */
export function publicAppUrl(env: Record<string, string | undefined> = process.env): string | undefined {
  const configured = env.APP_URL?.trim();
  if (configured) return configured;
  const host = env.VERCEL === "1" ? env.VERCEL_PROJECT_PRODUCTION_URL?.trim() : "";
  return host ? `https://${host}` : undefined;
}

export class AppUrlNotConfiguredError extends Error {
  constructor() {
    super("APP_URL is not configured; refusing to derive public links from request headers.");
    this.name = "AppUrlNotConfiguredError";
  }
}

export function resolveAppOrigin({ configured, nodeEnv, header }: AppOriginInput): string {
  const trimmed = configured?.trim().replace(/\/+$/, "");
  if (trimmed) return trimmed;
  if (nodeEnv === "production") throw new AppUrlNotConfiguredError();
  const host = header("x-forwarded-host") ?? header("host") ?? "localhost:3000";
  const proto = header("x-forwarded-proto") ?? (/^(localhost|127\.0\.0\.1|\[::1\])(:|$)/.test(host) ? "http" : "https");
  return `${proto}://${host}`;
}
