import { describe, expect, it, vi } from "vitest";
import { toSendOutcome, withTimeout } from "../submitOutcome";

describe("toSendOutcome", () => {
  it("montre un renvoi déjà reçu comme un succès", () => {
    expect(toSendOutcome("duplicate")).toBe("sent");
  });

  it("garde la limite de débit", () => {
    expect(toSendOutcome("rate_limited")).toBe("rate_limited");
  });

  it("garde l'échec", () => {
    expect(toSendOutcome("failed")).toBe("failed");
  });
});

describe("withTimeout", () => {
  it("rend la valeur quand la promesse arrive à temps", async () => {
    expect(await withTimeout(Promise.resolve("sent"), 1000)).toBe("sent");
  });

  it("rend timeout quand la promesse tarde", async () => {
    vi.useFakeTimers();
    const pending = withTimeout(new Promise<string>(() => {}), 1000);
    vi.advanceTimersByTime(1000);
    expect(await pending).toBe("timeout");
    vi.useRealTimers();
  });
});
