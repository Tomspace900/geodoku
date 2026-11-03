import { describe, expect, it } from "vitest";
import {
  betterThanPercent,
  buildCohort,
  chartBarIndex,
  chartBars,
  emptyCohort,
  failureRates,
  isThinCohort,
  medianScore,
  scoreBucket,
} from "../cohort";
import { toGuessDistribution } from "../distribution";
import { emptyGameRecord, type GameRecord } from "../gameRecord";

function histogramWith(entries: Record<number, number>): number[] {
  const { histogram } = emptyCohort();
  Object.entries(entries).forEach(([bucket, n]) => {
    histogram[Number(bucket)] = n;
  });
  return histogram;
}

describe("scoreBucket", () => {
  it("range 1000 dans son propre seau", () => {
    expect(scoreBucket(1000)).toBe(100);
  });

  it("arrondit à la dizaine inférieure", () => {
    expect(scoreBucket(789)).toBe(78);
  });
});

describe("betterThanPercent", () => {
  it("compte les seaux inférieurs et la moitié du sien", () => {
    // 2 joueurs à 300, 1 à 500 (toi), 1 à 800 : (2 + 0,5) / 4.
    const histogram = histogramWith({ 30: 2, 50: 1, 80: 1 });
    expect(betterThanPercent(histogram, 505)).toBe(63);
  });

  it("vaut 0 sans partie finie", () => {
    expect(betterThanPercent(emptyCohort().histogram, 500)).toBe(0);
  });
});

describe("medianScore", () => {
  it("prend le milieu du seau qui franchit la moitié", () => {
    expect(medianScore(histogramWith({ 30: 1, 60: 2, 90: 1 }))).toBe(605);
  });

  it("vaut null sans partie finie", () => {
    expect(medianScore(emptyCohort().histogram)).toBeNull();
  });
});

describe("chartBars", () => {
  it("regroupe en 20 barres de 50 points, 1000 dans la dernière", () => {
    const bars = chartBars(histogramWith({ 0: 1, 4: 1, 5: 1, 100: 1 }));
    expect([bars.length, bars[0], bars[1], bars[19]]).toEqual([20, 2, 1, 1]);
  });

  it("place 1000 sur la dernière barre", () => {
    expect(chartBarIndex(1000)).toBe(19);
  });
});

describe("isThinCohort", () => {
  it("est mince sous 5 parties finies", () => {
    expect(isThinCohort(histogramWith({ 50: 4 }))).toBe(true);
  });
});

describe("failureRates", () => {
  it("se tait sur une cohorte mince", () => {
    expect(
      failureRates({
        failedPlayers: [1, 0, 0, 0, 0, 0, 0, 0, 0],
        finishedGames: 4,
      }),
    ).toBeNull();
  });

  it("divise par le nombre de parties finies", () => {
    expect(
      failureRates({
        failedPlayers: [5, 0, 0, 0, 0, 0, 0, 0, 0],
        finishedGames: 10,
      })?.[0],
    ).toBe(0.5);
  });
});

describe("buildCohort", () => {
  const answers: Record<string, string[]> = {
    "0,0": ["FRA"],
    "0,1": ["ITA"],
    "0,2": ["ESP"],
    "1,0": ["PRT"],
    "1,1": ["BEL"],
    "1,2": ["NLD"],
    "2,0": ["AUT"],
    "2,1": ["CHE"],
    "2,2": ["DEU"],
  };
  const full: GameRecord = {
    cells: ["FRA", "ITA", "ESP", "PRT", "BEL", "NLD", "AUT", "CHE", "DEU"],
    failed: [1, 0, 0, 0, 0, 0, 0, 0, 0],
  };
  const distribution = toGuessDistribution(
    Object.fromEntries(
      Object.entries(answers).map(([key, [iso]]) => [key, { [iso]: 1 }]),
    ),
  );

  it("ignore les parties en cours", () => {
    const cohort = buildCohort([emptyGameRecord()], answers, distribution);
    expect(cohort.histogram.reduce((a, b) => a + b, 0)).toBe(0);
  });

  it("place une grille pleine sans rareté à 450 + 4 vies", () => {
    // Chaque pays a une part de 100 % : rareté nulle.
    const cohort = buildCohort([full], answers, distribution);
    expect(cohort.histogram[scoreBucket(450 + 4 * 20)]).toBe(1);
  });

  it("compte un joueur par case où il s'est trompé", () => {
    const cohort = buildCohort([full], answers, distribution);
    expect(cohort.failedPlayers).toEqual([1, 0, 0, 0, 0, 0, 0, 0, 0]);
  });
});
