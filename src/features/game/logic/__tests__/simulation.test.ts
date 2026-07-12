import { describe, expect, it } from "vitest";
import type { ConstraintId } from "../constraints";
import {
  BATCH_WIN_RATE,
  type SimulationContext,
  batchComposition,
  buildLivesDefeatPlan,
  buildRandomPlayerBatch,
  buildWinPlan,
  isTargetValid,
  pickCountryAttempt,
  randomPlayerTarget,
  simulatePlanLocally,
  solveGrid,
} from "../simulation";

function mulberry32(seed: number): () => number {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4_294_967_296;
  };
}

const ROWS = [
  "continent_europe",
  "continent_asia",
  "continent_africa",
] as ConstraintId[];
const COLS = [
  "water_landlocked",
  "water_island",
  "borders_min_5",
] as ConstraintId[];

const validAnswers: Record<string, string[]> = {
  "0,0": ["FRA", "DEU"],
  "0,1": ["DEU", "ESP"],
  "0,2": ["ESP", "ITA"],
  "1,0": ["ITA", "PRT"],
  "1,1": ["PRT", "NLD"],
  "1,2": ["NLD", "BEL"],
  "2,0": ["BEL", "AUT"],
  "2,1": ["AUT", "CHE"],
  "2,2": ["CHE", "POL"],
};

const ctx: SimulationContext = { validAnswers, rows: ROWS, cols: COLS };

describe("solveGrid", () => {
  it("finds a perfect matching on a solvable grid", () => {
    expect(solveGrid(validAnswers)).not.toBeNull();
  });
});

describe("buildWinPlan", () => {
  it("builds a perfect win with 5 lives", () => {
    const actions = buildWinPlan(ctx, 5);
    expect(actions).not.toBeNull();
    const state = simulatePlanLocally(ctx, actions!);
    expect(state.status).toBe("won");
    expect(state.remainingLives).toBe(5);
  });

  it("builds a win with 3 lives after 2 failures", () => {
    const actions = buildWinPlan(ctx, 3);
    expect(actions).not.toBeNull();
    const state = simulatePlanLocally(ctx, actions!);
    expect(state.status).toBe("won");
    expect(state.remainingLives).toBe(3);
  });

  it("varies country picks across players with different seeds", () => {
    const planA = buildWinPlan(ctx, 5, mulberry32(1));
    const planB = buildWinPlan(ctx, 5, mulberry32(2));
    expect(planA).not.toBeNull();
    expect(planB).not.toBeNull();
    const codesA = planA!
      .filter((a) => a.type === "submit")
      .map((a) => a.countryCode)
      .join(",");
    const codesB = planB!
      .filter((a) => a.type === "submit")
      .map((a) => a.countryCode)
      .join(",");
    expect(codesA).not.toBe(codesB);
  });
});

describe("buildLivesDefeatPlan", () => {
  it("ends with 0 lives and 3 filled cells", () => {
    const actions = buildLivesDefeatPlan(ctx, 3);
    expect(actions).not.toBeNull();
    const state = simulatePlanLocally(ctx, actions!);
    expect(state.status).toBe("lost");
    expect(state.remainingLives).toBe(0);
    const filled = Object.values(state.cells).filter(
      (c) => c.status === "filled",
    ).length;
    expect(filled).toBe(3);
  });
});

describe("batchComposition", () => {
  it("targets ~55% wins and 1 blocked for count 20", () => {
    const comp = batchComposition(20, true);
    expect(comp.wins).toBe(Math.round(20 * BATCH_WIN_RATE));
    expect(comp.blocked).toBe(1);
    expect(comp.lives).toBe(20 - comp.wins - comp.blocked);
  });

  it("skips blocked below the minimum count", () => {
    expect(batchComposition(4, true).blocked).toBe(0);
  });
});

describe("buildRandomPlayerBatch", () => {
  it("builds a shuffled batch matching composition", () => {
    const batch = buildRandomPlayerBatch(ctx, 20, mulberry32(42));
    expect(batch).not.toBeNull();
    expect(batch!.plans).toHaveLength(20);
    const wins = batch!.plans.filter(
      (p) => p.target.endReason === "win",
    ).length;
    const blocked = batch!.plans.filter(
      (p) => p.target.endReason === "blocked",
    ).length;
    expect(wins).toBe(batch!.composition.wins);
    expect(blocked).toBe(batch!.composition.blocked);
  });
});

describe("pickCountryAttempt", () => {
  it("submits a valid country when rng is below the hit rate", () => {
    let n = 0;
    const rng = () => {
      n += 1;
      return n === 1 ? 0.1 : 0.9;
    };
    const attempt = pickCountryAttempt(ctx, "0,0", new Set(), rng);
    expect(attempt.kind).toBe("submit");
  });

  it("fails when rng is above the hit rate", () => {
    const attempt = pickCountryAttempt(ctx, "0,0", new Set(), () => 0.99);
    expect(attempt.kind).toBe("fail");
  });
});

describe("randomPlayerTarget", () => {
  it("returns a playable plan with a fixed seed", () => {
    const rng = () => 0.1;
    const rolled = randomPlayerTarget(ctx, rng);
    expect(rolled).not.toBeNull();
    const state = simulatePlanLocally(ctx, rolled!.actions);
    expect(state.status).not.toBe("playing");
  });
});

describe("isTargetValid", () => {
  it("rejects win with 0 lives", () => {
    expect(
      isTargetValid({ endReason: "win", filledCells: 9, livesLeft: 0 }),
    ).toBe(false);
  });

  it("accepts lives defeat with 0 lives", () => {
    expect(
      isTargetValid({ endReason: "lives", filledCells: 3, livesLeft: 0 }),
    ).toBe(true);
  });
});
