// Cookies ignore ports: each independently deployed app needs its own session on localhost.
export function appCookieName(name: string): string {
  const app = process.env.NEXT_PUBLIC_MENZU_APP;
  return app === "courier" || app === "restaurant" ? `${name}-${app}` : name;
}

export function supabaseCookieOptions() {
  const project = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split(".")[0];
  return { name: appCookieName(`sb-${project}-auth-token`) };
}
