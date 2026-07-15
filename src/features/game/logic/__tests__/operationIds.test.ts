import { STORAGE_KEYS } from "@/lib/storage";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearPendingOperationId,
  createOperationId,
  getOrCreatePendingOperationId,
} from "../operationIds";

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function deterministicGetRandomValues<T extends ArrayBufferView | null>(
  array: T,
): T {
  if (array instanceof Uint8Array) {
    array.set(Array.from({ length: array.length }, (_, index) => index));
  }
  return array;
}

describe("operation ids", () => {
  it("reuses the same opaque id until an operation is acknowledged", () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue(
      "00000000-0000-4000-8000-000000000001",
    );

    const first = getOrCreatePendingOperationId("game-end:2026-07-14");
    const retry = getOrCreatePendingOperationId("game-end:2026-07-14");

    expect(retry).toBe(first);
  });

  it("creates a fresh id after the acknowledged operation is cleared", () => {
    vi.spyOn(crypto, "randomUUID")
      .mockReturnValueOnce("00000000-0000-4000-8000-000000000001")
      .mockReturnValueOnce("00000000-0000-4000-8000-000000000002");
    const first = getOrCreatePendingOperationId("rating:2026-07-14");

    clearPendingOperationId("rating:2026-07-14", first);

    expect(getOrCreatePendingOperationId("rating:2026-07-14")).not.toBe(first);
  });

  it("does not clear a newer operation with a stale acknowledgement", () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue(
      "00000000-0000-4000-8000-000000000001",
    );
    const operationId = getOrCreatePendingOperationId("guess:2026-07-14:0,0");

    clearPendingOperationId(
      "guess:2026-07-14:0,0",
      "00000000-0000-4000-8000-000000000099",
    );

    expect(getOrCreatePendingOperationId("guess:2026-07-14:0,0")).toBe(
      operationId,
    );
  });

  it("creates non-persisted ids for one-shot attempts", () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue(
      "00000000-0000-4000-8000-000000000003",
    );

    expect(createOperationId()).toBe("00000000-0000-4000-8000-000000000003");
  });

  it("creates a validator-compatible UUID v4 when randomUUID is unavailable", () => {
    vi.stubGlobal("crypto", {
      getRandomValues: deterministicGetRandomValues,
    });

    expect(createOperationId()).toBe("00010203-0405-4607-8809-0a0b0c0d0e0f");
  });

  it("creates a validator-compatible UUID v4 when randomUUID throws", () => {
    vi.stubGlobal("crypto", {
      randomUUID: () => {
        throw new Error("Unavailable in this context");
      },
      getRandomValues: deterministicGetRandomValues,
    });

    expect(createOperationId()).toBe("00010203-0405-4607-8809-0a0b0c0d0e0f");
  });

  it("keeps distinct pending ids for distinct guess payloads", () => {
    vi.spyOn(crypto, "randomUUID")
      .mockReturnValueOnce("00000000-0000-4000-8000-000000000004")
      .mockReturnValueOnce("00000000-0000-4000-8000-000000000005");

    const france = getOrCreatePendingOperationId("guess:2026-07-14:0,0:FRA");
    const spain = getOrCreatePendingOperationId("guess:2026-07-14:0,0:ESP");

    expect(spain).not.toBe(france);
  });

  it("replaces a corrupted pending operation id", () => {
    const slot = "game-end:2026-07-15";
    localStorage.setItem(
      STORAGE_KEYS.pendingOperations,
      JSON.stringify({
        [slot]: { operationId: "not-a-uuid", createdAt: Date.now() },
      }),
    );
    vi.spyOn(crypto, "randomUUID").mockReturnValue(
      "00000000-0000-4000-8000-000000000006",
    );

    const operationId = getOrCreatePendingOperationId(slot);
    const stored = JSON.parse(
      localStorage.getItem(STORAGE_KEYS.pendingOperations)!,
    ) as Record<string, { operationId: string }>;
    expect([operationId, stored[slot].operationId]).toEqual([
      "00000000-0000-4000-8000-000000000006",
      "00000000-0000-4000-8000-000000000006",
    ]);
  });

  it("keeps a pending id in memory when localStorage rejects writes", () => {
    const setItem = vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw new Error("Storage unavailable");
    });
    vi.spyOn(crypto, "randomUUID")
      .mockReturnValueOnce("00000000-0000-4000-8000-000000000007")
      .mockReturnValueOnce("00000000-0000-4000-8000-000000000008");

    const first = getOrCreatePendingOperationId("game-end:2026-07-16");
    const retry = getOrCreatePendingOperationId("game-end:2026-07-16");
    setItem.mockRestore();

    expect(retry).toBe(first);
  });

  it("does not resurrect an acknowledged id when clearing storage fails", () => {
    const slot = "grid-feedback:2026-07-17";
    vi.spyOn(crypto, "randomUUID")
      .mockReturnValueOnce("00000000-0000-4000-8000-000000000014")
      .mockReturnValueOnce("00000000-0000-4000-8000-000000000015");
    const acknowledged = getOrCreatePendingOperationId(slot);
    const setItem = vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw new Error("Storage unavailable");
    });

    clearPendingOperationId(slot, acknowledged);
    const next = getOrCreatePendingOperationId(slot);
    setItem.mockRestore();

    expect(next).toBe("00000000-0000-4000-8000-000000000015");
  });
});
