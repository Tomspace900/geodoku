import { STORAGE_KEYS } from "@/lib/storage";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getOrCreateClientId", () => {
  it("creates and persists a UUID v4 when randomUUID throws", async () => {
    vi.stubGlobal("crypto", {
      randomUUID: () => {
        throw new Error("Unavailable in this context");
      },
      getRandomValues: <T extends ArrayBufferView | null>(array: T): T => {
        if (array instanceof Uint8Array) {
          array.set(Array.from({ length: array.length }, (_, index) => index));
        }
        return array;
      },
    });

    const { getOrCreateClientId } = await import("../clientId");
    const clientId = getOrCreateClientId();

    expect([clientId, localStorage.getItem(STORAGE_KEYS.clientId)]).toEqual([
      "00010203-0405-4607-8809-0a0b0c0d0e0f",
      "00010203-0405-4607-8809-0a0b0c0d0e0f",
    ]);
  });

  it("replaces a stored client id rejected by the server contract", async () => {
    localStorage.setItem(STORAGE_KEYS.clientId, "invalid client id");
    vi.spyOn(crypto, "randomUUID").mockReturnValue(
      "00000000-0000-4000-8000-000000000009",
    );
    const { getOrCreateClientId } = await import("../clientId");

    const clientId = getOrCreateClientId();

    expect([clientId, localStorage.getItem(STORAGE_KEYS.clientId)]).toEqual([
      "00000000-0000-4000-8000-000000000009",
      "00000000-0000-4000-8000-000000000009",
    ]);
  });

  it("keeps a non-UUID client id accepted by the server contract", async () => {
    localStorage.setItem(STORAGE_KEYS.clientId, "legacy_client:id-123");
    const { getOrCreateClientId } = await import("../clientId");

    expect(getOrCreateClientId()).toBe("legacy_client:id-123");
  });

  it("keeps one client id in memory when localStorage rejects writes", async () => {
    const setItem = vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw new Error("Storage unavailable");
    });
    vi.spyOn(crypto, "randomUUID")
      .mockReturnValueOnce("00000000-0000-4000-8000-000000000010")
      .mockReturnValueOnce("00000000-0000-4000-8000-000000000011");
    const { getOrCreateClientId } = await import("../clientId");

    const first = getOrCreateClientId();
    const second = getOrCreateClientId();
    setItem.mockRestore();

    expect(second).toBe(first);
  });

  it("keeps the regenerated id when an invalid stored value cannot be overwritten", async () => {
    localStorage.setItem(STORAGE_KEYS.clientId, "invalid client id");
    const setItem = vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw new Error("Storage unavailable");
    });
    vi.spyOn(crypto, "randomUUID")
      .mockReturnValueOnce("00000000-0000-4000-8000-000000000012")
      .mockReturnValueOnce("00000000-0000-4000-8000-000000000013");
    const { getOrCreateClientId } = await import("../clientId");

    const first = getOrCreateClientId();
    const retry = getOrCreateClientId();
    setItem.mockRestore();

    expect(retry).toBe(first);
  });
});
