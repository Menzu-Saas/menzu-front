import "server-only";
import type { AsaasClient } from "./asaas-client";

export type PixKeyState = "ACTIVE" | "PENDING" | "MISSING";

/** `null` when the keys cannot be read: never create one blindly, it could duplicate an existing key. */
export async function pixKeyState(client: AsaasClient): Promise<PixKeyState | null> {
  try {
    const { data } = await client.listPixKeys();
    if (data.some((key) => key.status === "ACTIVE")) return "ACTIVE";
    return data.some((key) => key.status === "AWAITING_ACTIVATION") ? "PENDING" : "MISSING";
  } catch {
    return null;
  }
}

/**
 * Makes sure the account has a Pix key. Creates a random key only when there is none active or on the way,
 * then confirms by listing: the result of the creation request alone is not trusted (it may fail with the
 * key created anyway). Activation takes a moment, so it checks a few times.
 */
export async function ensurePixKey(
  client: AsaasClient,
  { attempts = 3, delayMs = 2000, wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms)) } = {},
): Promise<PixKeyState | null> {
  let state = await pixKeyState(client);
  if (state === null || state === "ACTIVE") return state;
  if (state === "MISSING") {
    // A failure here is not final: the list below says what really happened. The POST is sent once.
    await client.createRandomPixKey().catch(() => undefined);
    state = (await pixKeyState(client)) ?? "MISSING";
  }
  for (let i = 0; i < attempts && state === "PENDING"; i++) {
    await wait(delayMs);
    state = (await pixKeyState(client)) ?? state;
  }
  return state;
}
