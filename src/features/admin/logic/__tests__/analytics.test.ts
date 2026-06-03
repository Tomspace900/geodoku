import { describe, expect, it } from "vitest";
import {
  type FeedbackRow,
  buildCalendarMarkers,
  buildSummary,
  buildTrend,
  hasStruggleData,
  struggleRate,
  winRateDotClass,
} from "../analytics";

function feedbackRow(
  over: Partial<FeedbackRow> & { date: string },
): FeedbackRow {
  return {
    date: over.date,
    ratingCount: over.ratingCount ?? 0,
    gamesPlayed: over.gamesPlayed ?? 0,
    difficultyObserved100: over.difficultyObserved100 ?? null,
    winRate: over.winRate ?? null,
    avgFilledCells: over.avgFilledCells ?? null,
    wins: over.wins ?? 0,
    losses: over.losses ?? 0,
    lostByLives: over.lostByLives ?? 0,
    lostByBlocked: over.lostByBlocked ?? 0,
  };
}

describe("hasStruggleData", () => {
  it("is false before the instrumentation date", () => {
    expect(hasStruggleData("2026-05-29")).toBe(false);
  });

  it("is true on and after the instrumentation date", () => {
    expect(hasStruggleData("2026-05-30")).toBe(true);
    expect(hasStruggleData("2026-06-03")).toBe(true);
  });
});

describe("struggleRate", () => {
  it("returns null when the cell was never attempted", () => {
    expect(struggleRate({ failedAttempts: 0, totalGuesses: 0 })).toBeNull();
  });

  it("is failed / (failed + success)", () => {
    expect(struggleRate({ failedAttempts: 1, totalGuesses: 3 })).toBe(0.25);
  });

  it("is 1 when every attempt failed", () => {
    expect(struggleRate({ failedAttempts: 4, totalGuesses: 0 })).toBe(1);
  });
});

describe("buildCalendarMarkers", () => {
  const today = "2026-06-03";

  it("marks a past scheduled day as observed with its winRate", () => {
    const markers = buildCalendarMarkers({
      today,
      scheduled: [{ date: "2026-06-01", difficulty: 40 }],
      winRateByDate: new Map([["2026-06-01", 0.5]]),
      upcoming: [],
    });
    expect(markers.get("2026-06-01")).toEqual({
      kind: "observed",
      winRate: 0.5,
    });
  });

  it("marks a past scheduled day with no games as observed/null (not zero)", () => {
    const markers = buildCalendarMarkers({
      today,
      scheduled: [{ date: "2026-06-01", difficulty: 40 }],
      winRateByDate: new Map(),
      upcoming: [],
    });
    expect(markers.get("2026-06-01")).toEqual({
      kind: "observed",
      winRate: null,
    });
  });

  it("marks today and future scheduled days as estimated", () => {
    const markers = buildCalendarMarkers({
      today,
      scheduled: [
        { date: today, difficulty: 55 },
        { date: "2026-06-05", difficulty: 70 },
      ],
      winRateByDate: new Map(),
      upcoming: [],
    });
    expect(markers.get(today)).toEqual({ kind: "estimated", difficulty: 55 });
    expect(markers.get("2026-06-05")).toEqual({
      kind: "estimated",
      difficulty: 70,
    });
  });

  it("adds predicted and missing days from upcoming without overwriting scheduled", () => {
    const markers = buildCalendarMarkers({
      today,
      scheduled: [{ date: "2026-06-05", difficulty: 70 }],
      winRateByDate: new Map(),
      upcoming: [
        { date: "2026-06-05", kind: "scheduled" }, // déjà couvert → estimated conservé
        { date: "2026-06-06", kind: "predicted" },
        { date: "2026-06-07", kind: "missing" },
      ],
    });
    expect(markers.get("2026-06-05")).toEqual({
      kind: "estimated",
      difficulty: 70,
    });
    expect(markers.get("2026-06-06")).toEqual({ kind: "predicted" });
    expect(markers.get("2026-06-07")).toEqual({ kind: "missing" });
  });
});

describe("buildTrend", () => {
  function row(over: Partial<FeedbackRow> & { date: string }): FeedbackRow {
    return {
      date: over.date,
      ratingCount: over.ratingCount ?? 0,
      gamesPlayed: over.gamesPlayed ?? 0,
      difficultyObserved100: over.difficultyObserved100 ?? null,
      winRate: over.winRate ?? null,
      avgFilledCells: over.avgFilledCells ?? null,
      wins: over.wins ?? 0,
      losses: over.losses ?? 0,
      lostByLives: over.lostByLives ?? 0,
      lostByBlocked: over.lostByBlocked ?? 0,
    };
  }

  it("keeps only the most recent `days` rows", () => {
    const feedback = [
      row({ date: "2026-06-03" }),
      row({ date: "2026-06-02" }),
      row({ date: "2026-06-01" }),
    ];
    expect(buildTrend(feedback, 2).map((r) => r.date)).toEqual([
      "2026-06-03",
      "2026-06-02",
    ]);
  });

  it("flags lossSplitPending when losses exist but none are classified", () => {
    const [r] = buildTrend([
      row({ date: "2026-06-02", losses: 3, lostByLives: 0, lostByBlocked: 0 }),
    ]);
    expect(r.lossSplitPending).toBe(true);
  });

  it("does not flag lossSplitPending once losses are classified", () => {
    const [r] = buildTrend([
      row({ date: "2026-06-02", losses: 3, lostByLives: 2, lostByBlocked: 1 }),
    ]);
    expect(r.lossSplitPending).toBe(false);
  });

  it("does not flag lossSplitPending when there are no losses", () => {
    const [r] = buildTrend([row({ date: "2026-06-02", losses: 0 })]);
    expect(r.lossSplitPending).toBe(false);
  });
});

describe("buildSummary", () => {
  it("aggregates wins/losses and computes a pooled win rate", () => {
    const s = buildSummary([
      feedbackRow({ date: "2026-06-03", gamesPlayed: 4, wins: 3, losses: 1 }),
      feedbackRow({ date: "2026-06-02", gamesPlayed: 6, wins: 2, losses: 4 }),
    ]);
    expect(s.finished).toBe(10);
    expect(s.wins).toBe(5);
    expect(s.losses).toBe(5);
    expect(s.winRate).toBe(0.5);
    expect(s.days).toBe(2);
  });

  it("returns null win rate when nothing is finished", () => {
    expect(
      buildSummary([feedbackRow({ date: "2026-06-03" })]).winRate,
    ).toBeNull();
  });

  it("flags lossSplitPending when defeats exist but none are classified", () => {
    const s = buildSummary([
      feedbackRow({ date: "2026-06-03", gamesPlayed: 2, losses: 2 }),
    ]);
    expect(s.lossSplitPending).toBe(true);
  });

  it("computes average per day and peak max/min", () => {
    const s = buildSummary([
      feedbackRow({ date: "2026-06-03", gamesPlayed: 2 }),
      feedbackRow({ date: "2026-06-02", gamesPlayed: 8 }),
      feedbackRow({ date: "2026-06-01", gamesPlayed: 5 }),
    ]);
    expect(s.avgFinishedPerDay).toBe(5); // (2+8+5)/3
    expect(s.peakMax).toBe(8);
    expect(s.peakMin).toBe(2);
  });

  it("returns zero peaks/average for an empty window", () => {
    const s = buildSummary([]);
    expect(s.avgFinishedPerDay).toBe(0);
    expect(s.peakMax).toBe(0);
    expect(s.peakMin).toBe(0);
  });

  it("only aggregates the most recent `days` rows", () => {
    const feedback = [
      feedbackRow({ date: "2026-06-03", gamesPlayed: 1, wins: 1 }),
      feedbackRow({ date: "2026-06-02", gamesPlayed: 1, wins: 1 }),
      feedbackRow({ date: "2026-06-01", gamesPlayed: 1, wins: 1 }),
    ];
    expect(buildSummary(feedback, 2).finished).toBe(2);
  });
});

describe("winRateDotClass", () => {
  it("is neutral when winRate is null", () => {
    expect(winRateDotClass(null)).toBe("bg-outline-variant/40");
  });

  it("maps high/medium/low winRate to success/warning/error", () => {
    expect(winRateDotClass(0.8)).toBe("bg-success");
    expect(winRateDotClass(0.45)).toBe("bg-warning");
    expect(winRateDotClass(0.1)).toBe("bg-error");
  });
});
