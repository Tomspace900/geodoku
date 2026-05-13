import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  concentrationIndex,
  formatPercent,
  isFutureDate,
} from "../cellMetrics";

describe("formatPercent", () => {
  it("rounds to nearest integer and appends ' %'", () => {
    expect(formatPercent(0.78)).toBe("78 %");
    expect(formatPercent(0.785)).toBe("79 %");
  });

  it("handles 0 and 1", () => {
    expect(formatPercent(0)).toBe("0 %");
    expect(formatPercent(1)).toBe("100 %");
  });
});

describe("concentrationIndex", () => {
  it("returns the share of the first (top) entry", () => {
    expect(concentrationIndex([{ share: 0.62 }, { share: 0.2 }])).toBe(0.62);
  });

  it("returns 0 on empty list", () => {
    expect(concentrationIndex([])).toBe(0);
  });
});

describe("isFutureDate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 13, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns true for a date after today", () => {
    expect(isFutureDate("2026-05-14")).toBe(true);
  });

  it("returns false for today", () => {
    expect(isFutureDate("2026-05-13")).toBe(false);
  });

  it("returns false for a past date", () => {
    expect(isFutureDate("2026-05-12")).toBe(false);
  });
});
