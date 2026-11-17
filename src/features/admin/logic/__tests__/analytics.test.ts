import { describe, expect, it } from "vitest";
import {
  averageRate,
  buildCalendarMarkers,
  buildSummary,
  buildTrend,
  CELL_RATE_MIN_FINISHED,
  cellRate,
  type FeedbackRow,
  GAME_ROWS_SINCE,
  hasGameRows,
} from "../analytics";

function feedbackRow(
  over: Partial<FeedbackRow> & { date: string },
): FeedbackRow {
  return {
    date: over.date,
    gamesPlayed: over.gamesPlayed ?? 0,
    winRate: over.winRate ?? null,
    avgFilledCells: over.avgFilledCells ?? null,
    wins: over.wins ?? 0,
    losses: over.losses ?? 0,
    lostByLives: over.lostByLives ?? 0,
    lostByBlocked: over.lostByBlocked ?? 0,
  };
}

describe("hasGameRows", () => {
  it("n'a pas de lignes de partie la veille de la bascule", () => {
    expect(hasGameRows("2026-11-04")).toBe(false);
  });

  it("en a dès le jour de la bascule", () => {
    expect(hasGameRows(GAME_ROWS_SINCE)).toBe(true);
    expect(hasGameRows("2026-11-17")).toBe(true);
  });
});

describe("cellRate", () => {
  it("ne se lit pas sur une cohorte mince", () => {
    expect(cellRate(2, CELL_RATE_MIN_FINISHED - 1)).toBeNull();
  });

  it("rapporte le compte aux parties finies", () => {
    expect(cellRate(3, 12)).toBe(0.25);
  });
});

describe("averageRate", () => {
  it("est null quand aucun taux n'est lisible", () => {
    expect(averageRate([null, null])).toBeNull();
  });

  it("ignore les taux illisibles", () => {
    expect(averageRate([0.2, null, 0.4])).toBeCloseTo(0.3);
  });
});

describe("buildCalendarMarkers", () => {
  const today = "2026-11-20";

  it("marque un jour passé d'avant la bascule sans % de victoires", () => {
    const markers = buildCalendarMarkers({
      today,
      scheduled: [{ date: "2026-11-04", gridPopTop3: null }],
      winRateByDate: new Map(),
      upcoming: [],
    });
    expect(markers.get("2026-11-04")).toEqual({ kind: "beforeRows" });
  });

  it("marks a past scheduled day as observed with its winRate", () => {
    const markers = buildCalendarMarkers({
      today,
      scheduled: [{ date: "2026-11-18", gridPopTop3: null }],
      winRateByDate: new Map([["2026-11-18", 0.5]]),
      upcoming: [],
    });
    expect(markers.get("2026-11-18")).toEqual({
      kind: "observed",
      winRate: 0.5,
    });
  });

  it("marks a past scheduled day with no games as observed/null (not zero)", () => {
    const markers = buildCalendarMarkers({
      today,
      scheduled: [{ date: "2026-11-18", gridPopTop3: null }],
      winRateByDate: new Map(),
      upcoming: [],
    });
    expect(markers.get("2026-11-18")).toEqual({
      kind: "observed",
      winRate: null,
    });
  });

  it("marks today and future scheduled days with their popularity score", () => {
    const markers = buildCalendarMarkers({
      today,
      scheduled: [
        { date: today, gridPopTop3: 0.724 },
        { date: "2026-11-22", gridPopTop3: null },
      ],
      winRateByDate: new Map(),
      upcoming: [],
    });
    expect(markers.get(today)).toEqual({ kind: "scheduled", popScore: 72 });
    expect(markers.get("2026-11-22")).toEqual({
      kind: "scheduled",
      popScore: null,
    });
  });

  it("adds predicted and missing days from upcoming without overwriting scheduled", () => {
    const markers = buildCalendarMarkers({
      today,
      scheduled: [{ date: "2026-11-22", gridPopTop3: 0.5 }],
      winRateByDate: new Map(),
      upcoming: [
        { date: "2026-11-22", kind: "scheduled" },
        { date: "2026-11-23", kind: "predicted", gridPopTop3: 0.65 },
        { date: "2026-11-24", kind: "missing" },
      ],
    });
    expect(markers.get("2026-11-22")).toEqual({
      kind: "scheduled",
      popScore: 50,
    });
    expect(markers.get("2026-11-23")).toEqual({
      kind: "predicted",
      popScore: 65,
    });
    expect(markers.get("2026-11-24")).toEqual({ kind: "missing" });
  });
});

describe("buildTrend", () => {
  function row(over: Partial<FeedbackRow> & { date: string }): FeedbackRow {
    return {
      date: over.date,
      gamesPlayed: over.gamesPlayed ?? 0,
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
});

describe("buildSummary", () => {
  const today = "2026-11-20";

  it("aggregates wins/losses and computes a pooled win rate", () => {
    const s = buildSummary(
      [
        feedbackRow({ date: "2026-11-19", gamesPlayed: 4, wins: 3, losses: 1 }),
        feedbackRow({ date: "2026-11-18", gamesPlayed: 6, wins: 2, losses: 4 }),
      ],
      today,
    );
    expect({
      finished: s.finished,
      wins: s.wins,
      losses: s.losses,
      winRate: s.winRate,
      days: s.days,
    }).toEqual({ finished: 10, wins: 5, losses: 5, winRate: 0.5, days: 2 });
  });

  it("returns null win rate when nothing is finished", () => {
    expect(
      buildSummary([feedbackRow({ date: "2026-11-19" })], today).winRate,
    ).toBeNull();
  });

  it("computes average per day and peak max/min", () => {
    const s = buildSummary(
      [
        feedbackRow({ date: "2026-11-19", gamesPlayed: 2 }),
        feedbackRow({ date: "2026-11-18", gamesPlayed: 8 }),
        feedbackRow({ date: "2026-11-17", gamesPlayed: 5 }),
      ],
      today,
    );
    expect([s.avgFinishedPerDay, s.peakMax, s.peakMin]).toEqual([5, 8, 2]);
  });

  it("compte le jour en cours dans les totaux, pas dans la moyenne, le pic ni le creux", () => {
    const s = buildSummary(
      [
        feedbackRow({ date: today, gamesPlayed: 1, wins: 1 }),
        feedbackRow({ date: "2026-11-19", gamesPlayed: 6 }),
        feedbackRow({ date: "2026-11-18", gamesPlayed: 4 }),
      ],
      today,
    );
    expect({
      finished: s.finished,
      avg: s.avgFinishedPerDay,
      peakMin: s.peakMin,
    }).toEqual({ finished: 11, avg: 5, peakMin: 4 });
  });

  it("returns zero peaks/average for an empty window", () => {
    const s = buildSummary([], today);
    expect([s.avgFinishedPerDay, s.peakMax, s.peakMin]).toEqual([0, 0, 0]);
  });

  it("only aggregates the most recent `days` rows", () => {
    const feedback = [
      feedbackRow({ date: "2026-11-19", gamesPlayed: 1, wins: 1 }),
      feedbackRow({ date: "2026-11-18", gamesPlayed: 1, wins: 1 }),
      feedbackRow({ date: "2026-11-17", gamesPlayed: 1, wins: 1 }),
    ];
    expect(buildSummary(feedback, today, 2).finished).toBe(2);
  });

  it("signale une fenêtre plus courte que demandé (journées d'avant la bascule)", () => {
    const feedback = [feedbackRow({ date: "2026-11-19", gamesPlayed: 1 })];
    expect(buildSummary(feedback, today, 30).shortWindow).toBe(true);
  });
});
