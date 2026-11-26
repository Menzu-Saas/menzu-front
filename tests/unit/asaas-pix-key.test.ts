import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { ensurePixKey } from "@/server/payments/asaas-pix-key";

const keys = (...statuses: string[]) => ({ data: statuses.map((status, i) => ({ id: "k" + i, status })) });
const noWait = { wait: async () => {} };

function client(...lists: unknown[]) {
  const listPixKeys = vi.fn();
  for (const item of lists) {
    if (item instanceof Error) listPixKeys.mockRejectedValueOnce(item);
    else listPixKeys.mockResolvedValueOnce(item);
  }
  const createRandomPixKey = vi.fn().mockResolvedValue({ id: "k", status: "AWAITING_ACTIVATION" });
  return { listPixKeys, createRandomPixKey };
}

describe("ensurePixKey", () => {
  it("does not create a key when one is already active", async () => {
    const c = client(keys("ACTIVE"));
    expect(await ensurePixKey(c as never, noWait)).toBe("ACTIVE");
    expect(c.createRandomPixKey).not.toHaveBeenCalled();
  });

  it("creates one random key and waits until it is active", async () => {
    const c = client(keys(), keys("AWAITING_ACTIVATION"), keys("ACTIVE"));
    expect(await ensurePixKey(c as never, noWait)).toBe("ACTIVE");
    expect(c.createRandomPixKey).toHaveBeenCalledTimes(1);
  });

  it("does not create another key while one is activating", async () => {
    const c = client(keys("AWAITING_ACTIVATION"), keys("AWAITING_ACTIVATION"), keys("AWAITING_ACTIVATION"), keys("AWAITING_ACTIVATION"));
    expect(await ensurePixKey(c as never, noWait)).toBe("PENDING");
    expect(c.createRandomPixKey).not.toHaveBeenCalled();
  });

  it("trusts the list over a failed creation request and never repeats it", async () => {
    const c = client(keys(), keys("ACTIVE"));
    c.createRandomPixKey.mockRejectedValue(new Error("too many requests"));
    expect(await ensurePixKey(c as never, noWait)).toBe("ACTIVE");
    expect(c.createRandomPixKey).toHaveBeenCalledTimes(1);
  });

  it("reports missing when creation really failed, and unknown when keys cannot be read", async () => {
    const failed = client(keys(), keys());
    failed.createRandomPixKey.mockRejectedValue(new Error("no"));
    expect(await ensurePixKey(failed as never, noWait)).toBe("MISSING");
    const unreadable = client(new Error("down"));
    expect(await ensurePixKey(unreadable as never, noWait)).toBeNull();
    expect(unreadable.createRandomPixKey).not.toHaveBeenCalled();
  });
});
