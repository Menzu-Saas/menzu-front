import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Password reset is allowed only from a recovery session (spec: "Esqueci minha senha"), never from
 * any signed-in session. Two proofs are accepted:
 *  1. the access token's `amr` claim has a `recovery` entry from the last hour (Supabase Auth
 *     records it for recovery links), or
 *  2. the `menzu_recovery` cookie that /auth/callback sets right after it exchanged a recovery link
 *     (and only a recovery link: `type=recovery`, or a PKCE code whose flow was started by
 *     resetPasswordForEmail). It is HMAC-signed with a server-only secret and bound to the session
 *     id, so a cookie cannot be forged or reused by another session. Valid for 30 minutes.
 *
 * Secret: MENZU_SESSION_SECRET (dedicated, >= 32 chars). When it is unset, a secret derived from
 * MENZU_ORDER_API_KEY is used (documented fallback; rotating the order key then invalidates
 * recovery cookies in flight). Without either, only the `amr` proof works.
 */
export const RECOVERY_COOKIE = "menzu_recovery";
export const RECOVERY_TTL_SECONDS = 30 * 60;
const AMR_MAX_AGE_SECONDS = 60 * 60;

type Env = Record<string, string | undefined>;

const MIN_SESSION_SECRET_LENGTH = 32;

function secret(env: Env): string | null {
  const dedicated = env.MENZU_SESSION_SECRET?.trim();
  if (dedicated && dedicated.length >= MIN_SESSION_SECRET_LENGTH) return `menzu-recovery:session:${dedicated}`;
  const key = env.MENZU_ORDER_API_KEY?.trim();
  return key ? `menzu-recovery:${key}` : null;
}

/**
 * True only for a password-recovery e-mail link: the token_hash flow says `type=recovery`; the
 * PKCE flow reports `redirectType === "recovery"` from exchangeCodeForSession (the verifier stored
 * by resetPasswordForEmail is marked as recovery). The `next` path never counts.
 */
export function isRecoveryLink(link: { type: string | null; redirectType?: string | null }): boolean {
  return link.type === "recovery" || link.redirectType === "recovery";
}

function mac(secretKey: string, sessionId: string, exp: number): string {
  return createHmac("sha256", secretKey).update(`${sessionId}.${exp}`).digest("base64url");
}

/** Cookie value for a fresh recovery session, or null when no server secret is configured. */
export function signRecoveryCookie(sessionId: string, nowMs = Date.now(), env: Env = process.env): string | null {
  const key = secret(env);
  if (!key || !sessionId) return null;
  const exp = Math.floor(nowMs / 1000) + RECOVERY_TTL_SECONDS;
  return `${exp}.${mac(key, sessionId, exp)}`;
}

export function verifyRecoveryCookie(
  value: string | undefined,
  sessionId: string | undefined,
  nowMs = Date.now(),
  env: Env = process.env,
): boolean {
  const key = secret(env);
  if (!key || !value || !sessionId) return false;
  const [expRaw, sig] = value.split(".");
  const exp = Number(expRaw);
  if (!Number.isInteger(exp) || exp < Math.floor(nowMs / 1000) || !sig) return false;
  const expected = Buffer.from(mac(key, sessionId, exp));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

type AmrEntry = { method?: unknown; timestamp?: unknown } | string;

/** True when the token's amr claim shows a recovery sign-in within the last hour. */
export function hasRecentRecoveryAmr(amr: unknown, nowMs = Date.now()): boolean {
  if (!Array.isArray(amr)) return false;
  const min = Math.floor(nowMs / 1000) - AMR_MAX_AGE_SECONDS;
  return (amr as AmrEntry[]).some(
    (e) => typeof e === "object" && e !== null && e.method === "recovery" && typeof e.timestamp === "number" && e.timestamp >= min,
  );
}
