import type { EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { authDefaultPath } from "@/lib/role-home";
import { safeNextPath } from "@/lib/safe-next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isRecoveryLink, RECOVERY_COOKIE, RECOVERY_TTL_SECONDS, signRecoveryCookie } from "@/server/recovery";

const OTP_TYPES: EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];

/**
 * Target of e-mail links (sign-up confirmation, password recovery). Supports the PKCE `code`
 * flow and the `token_hash` template flow, then forwards to the safe `next` path. Only a recovery
 * link (see isRecoveryLink) gets the signed, session-bound `menzu_recovery` cookie that unlocks
 * /redefinir-senha; any other link to that page still needs the `amr` proof.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const origin = request.nextUrl.origin;
  const next = safeNextPath(searchParams.get("next")) ?? authDefaultPath();
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const supabase = await createSupabaseServerClient();
  let ok = false;
  let redirectType: string | null = null;
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
    // auth-js returns `redirectType` ("recovery" for a resetPasswordForEmail flow) at runtime but
    // does not declare it on the type.
    const rt = (data as { redirectType?: unknown } | null)?.redirectType;
    redirectType = typeof rt === "string" ? rt : null;
  } else if (tokenHash && type && OTP_TYPES.includes(type)) {
    ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  }

  if (ok) {
    if (isRecoveryLink({ type: code ? null : type, redirectType })) {
      const { data } = await supabase.auth.getClaims();
      const sessionId = typeof data?.claims?.session_id === "string" ? data.claims.session_id : "";
      const value = signRecoveryCookie(sessionId);
      if (value) {
        (await cookies()).set(RECOVERY_COOKIE, value, {
          httpOnly: true,
          sameSite: "lax",
          secure: request.nextUrl.protocol === "https:",
          path: "/",
          maxAge: RECOVERY_TTL_SECONDS,
        });
      }
    }
    return NextResponse.redirect(new URL(next, origin));
  }

  const target = new URL(next, origin);
  const recovery = target.pathname === "/redefinir-senha";
  const fallback = recovery ? "/recuperar-senha" : "/entrar";
  const returnTo = recovery ? safeNextPath(target.searchParams.get("next")) : next;
  return NextResponse.redirect(new URL(`${fallback}?erro=link${returnTo ? `&next=${encodeURIComponent(returnTo)}` : ""}`, origin));
}
