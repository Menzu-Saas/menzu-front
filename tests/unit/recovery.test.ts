// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { hasRecentRecoveryAmr, isRecoveryLink, signRecoveryCookie, verifyRecoveryCookie } from "@/server/recovery";

const env = { MENZU_ORDER_API_KEY: "test-order-key-0123456789" };
const NOW = Date.UTC(2026, 9, 7, 12, 0, 0);

describe("recovery session proof", () => {
  it("accepts a fresh signed cookie for the same session only", () => {
    const value = signRecoveryCookie("session-a", NOW, env);
    expect(value).toBeTruthy();
    expect(verifyRecoveryCookie(value!, "session-a", NOW + 60_000, env)).toBe(true);
    expect(verifyRecoveryCookie(value!, "session-b", NOW, env)).toBe(false);
    expect(verifyRecoveryCookie(value!, "session-a", NOW + 31 * 60_000, env)).toBe(false);
    expect(verifyRecoveryCookie(value!, "session-a", NOW, { MENZU_ORDER_API_KEY: "other-key-0123456789" })).toBe(false);
    expect(verifyRecoveryCookie(`${Math.floor(NOW / 1000) + 600}.forged`, "session-a", NOW, env)).toBe(false);
    expect(verifyRecoveryCookie(undefined, "session-a", NOW, env)).toBe(false);
  });

  it("cannot sign without a server secret", () => {
    expect(signRecoveryCookie("session-a", NOW, {})).toBeNull();
    expect(verifyRecoveryCookie("1.x", "session-a", NOW, {})).toBe(false);
  });

  it("prefers the dedicated MENZU_SESSION_SECRET over the order-key fallback", () => {
    const session = { MENZU_SESSION_SECRET: "s".repeat(40), MENZU_ORDER_API_KEY: env.MENZU_ORDER_API_KEY };
    const value = signRecoveryCookie("session-a", NOW, session);
    expect(verifyRecoveryCookie(value!, "session-a", NOW, session)).toBe(true);
    // Rotating the order key no longer invalidates the cookie when the dedicated secret is set...
    expect(verifyRecoveryCookie(value!, "session-a", NOW, { ...session, MENZU_ORDER_API_KEY: "other-key-0123456789" })).toBe(true);
    // ...and a cookie signed with the fallback is not valid under the dedicated secret.
    expect(verifyRecoveryCookie(signRecoveryCookie("session-a", NOW, env)!, "session-a", NOW, session)).toBe(false);
    // A too-short dedicated secret is ignored (fallback used).
    const short = { MENZU_SESSION_SECRET: "short", MENZU_ORDER_API_KEY: env.MENZU_ORDER_API_KEY };
    expect(verifyRecoveryCookie(signRecoveryCookie("session-a", NOW, env)!, "session-a", NOW, short)).toBe(true);
  });

  it("only recovery links count, never the next path", () => {
    expect(isRecoveryLink({ type: "recovery" })).toBe(true);
    expect(isRecoveryLink({ type: null, redirectType: "recovery" })).toBe(true);
    expect(isRecoveryLink({ type: "magiclink" })).toBe(false);
    expect(isRecoveryLink({ type: "signup", redirectType: null })).toBe(false);
    expect(isRecoveryLink({ type: null, redirectType: null })).toBe(false);
  });

  it("recognises a recent recovery amr entry only", () => {
    const ts = Math.floor(NOW / 1000);
    expect(hasRecentRecoveryAmr([{ method: "recovery", timestamp: ts - 60 }], NOW)).toBe(true);
    expect(hasRecentRecoveryAmr([{ method: "recovery", timestamp: ts - 7200 }], NOW)).toBe(false);
    expect(hasRecentRecoveryAmr([{ method: "password", timestamp: ts }], NOW)).toBe(false);
    expect(hasRecentRecoveryAmr(["recovery"], NOW)).toBe(false);
    expect(hasRecentRecoveryAmr(undefined, NOW)).toBe(false);
  });
});
