import { describe, expect, it } from "vitest";
import { MAX_CACHED_DAYS, trimDayCache } from "../dayCache";
import type { FinishedDay } from "../finishedDay";

function day(date: string): FinishedDay {
  return {
    date,
    rows: ["a", "b", "c"],
    cols: ["d", "e", "f"],
    counts: {},
    blockableAnswers: {},
  };
}

describe("trimDayCache", () => {
  it("garde les jours les plus récents", () => {
    const days = new Map(
      Array.from({ length: MAX_CACHED_DAYS + 1 }, (_, i) => {
        const date = new Date(Date.UTC(2026, 0, 1) + i * 86_400_000)
          .toISOString()
          .slice(0, 10);
        return [date, day(date)] as const;
      }),
    );
    const kept = trimDayCache(days);
    expect([kept.length, kept.at(-1)?.date]).toEqual([
      MAX_CACHED_DAYS,
      "2026-01-02",
    ]);
  });
});
