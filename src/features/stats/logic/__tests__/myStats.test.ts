import { describe, expect, it } from "vitest";
import { emptyGameRecord } from "@/features/game/logic/gameRecord";
import {
  browsableDates,
  computeDayResult,
  computeMyStats,
  computeThemes,
  lastDates,
  type PlayedGame,
  recentDays,
  type StatsDay,
  wholePercents,
} from "../myStats";

const DATE = "2026-11-01";

/** Neuf pays distincts, un par case, dans l'ordre de `CELL_KEYS`. */
const PICKS = ["FRA", "DEU", "ITA", "ESP", "PRT", "BEL", "NLD", "AUT", "CHE"];

/** Chaque pays posé compte pour 1 joueur sur 10 : ultra partout. */
function day(overrides: Partial<StatsDay> = {}): StatsDay {
  const counts = Object.fromEntries(
    PICKS.map((iso, i) => [
      ["0,0", "0,1", "0,2", "1,0", "1,1", "1,2", "2,0", "2,1", "2,2"][i],
      { [iso]: 1, POL: 9 },
    ]),
  );
  return {
    date: DATE,
    rows: ["continent_europe", "flag_has_star", "population_gt_30M"],
    cols: ["continent_asia", "language_french", "area_gt_2M"],
    counts,
    blockableAnswers: {},
    complete: true,
    ...overrides,
  };
}

function game(cells: (string | null)[], failed?: number[]): PlayedGame {
  return {
    date: DATE,
    ...emptyGameRecord(),
    cells,
    ...(failed ? { failed } : {}),
  };
}

describe("computeDayResult", () => {
  it("compte une grille complète comme finie et gagnée", () => {
    const result = computeDayResult(game(PICKS), day());
    expect(result).toMatchObject({ finished: true, won: true });
  });

  it("donne 1000 points à une grille complète, ultra et sans erreur", () => {
    expect(computeDayResult(game(PICKS), day()).total).toBe(1000);
  });

  it("laisse en cours une partie passée abandonnée en route", () => {
    const cells = [...PICKS.slice(0, 3), ...Array(6).fill(null)];
    expect(computeDayResult(game(cells), day()).finished).toBe(false);
  });

  it("finit une partie sans vies, même incomplète", () => {
    const cells = [PICKS[0], ...Array(8).fill(null)];
    const failed = [0, 5, 0, 0, 0, 0, 0, 0, 0];
    expect(computeDayResult(game(cells, failed), day())).toMatchObject({
      finished: true,
      won: false,
    });
  });

  it("lit un blocage dans les réponses des petites cases", () => {
    // La dernière case n'accepte que FRA, déjà posé en 0,0.
    const cells = [...PICKS.slice(0, 8), null];
    const blocked = computeDayResult(
      game(cells),
      day({ blockableAnswers: { "2,2": ["FRA"] } }),
    );
    expect(blocked.cells["2,2"]).toEqual({ status: "blocked" });
  });

  it("finit une partie dont la dernière case est bloquée", () => {
    const cells = [...PICKS.slice(0, 8), null];
    const blocked = computeDayResult(
      game(cells),
      day({ blockableAnswers: { "2,2": ["FRA"] } }),
    );
    expect(blocked.finished).toBe(true);
  });

  it("vaut une part de 0 pour un pays absent d'un jour fini", () => {
    const result = computeDayResult(game(PICKS), day({ counts: {} }));
    expect(result.shares["0,0"]).toBe(0);
  });

  it("ajoute le coup du joueur à une cohorte encore ouverte", () => {
    const result = computeDayResult(
      game(PICKS),
      day({ counts: {}, complete: false }),
    );
    expect(result.shares["0,0"]).toBe(1);
  });
});

describe("computeMyStats", () => {
  it("ne compte que les parties finies", () => {
    const unfinished = computeDayResult(
      { ...game([PICKS[0], ...Array(8).fill(null)]), date: "2026-11-02" },
      day(),
    );
    const finished = computeDayResult(game(PICKS), day());
    expect(computeMyStats([finished, unfinished]).played).toBe(1);
  });

  it("garde la date du premier record en cas d'égalité", () => {
    const first = computeDayResult(game(PICKS), day());
    const second = { ...first, date: "2026-11-05" };
    expect(computeMyStats([first, second]).best).toEqual({
      date: DATE,
      total: 1000,
    });
  });

  it("range les pays posés dans la palette", () => {
    const stats = computeMyStats([computeDayResult(game(PICKS), day())]);
    expect(stats.tierPercents).toEqual({
      common: 0,
      uncommon: 0,
      rare: 0,
      ultra: 100,
    });
  });

  it("ne donne aucun record sans partie finie", () => {
    expect(computeMyStats([]).best).toBeNull();
  });
});

describe("wholePercents", () => {
  it("somme toujours à 100", () => {
    const percents = wholePercents({ a: 1, b: 1, c: 1 }, ["a", "b", "c"]);
    expect(percents.a + percents.b + percents.c).toBe(100);
  });

  it("donne le reste aux plus forts restes", () => {
    expect(wholePercents({ a: 2, b: 1 }, ["a", "b"])).toEqual({ a: 67, b: 33 });
  });
});

describe("computeThemes", () => {
  it("compte une case pour ses deux thématiques", () => {
    const themes = computeThemes([computeDayResult(game(PICKS), day())], 1);
    // continent_europe (3 cases) et continent_asia (3 cases), entre autres.
    expect(themes.find((t) => t.id === "continent_europe")?.cells).toBe(3);
  });

  it("ne classe pas une thématique sous le seuil", () => {
    const themes = computeThemes([computeDayResult(game(PICKS), day())], 4);
    expect(themes.some((t) => t.id === "continent_europe")).toBe(false);
  });

  it("mesure les cases trouvées du premier coup", () => {
    const failed = [1, 0, 0, 0, 0, 0, 0, 0, 0];
    const themes = computeThemes(
      [computeDayResult(game(PICKS, failed), day())],
      1,
    );
    expect(themes.find((t) => t.id === "continent_europe")?.firstTry).toBe(2);
  });
});

describe("lastDates", () => {
  it("finit par aujourd'hui", () => {
    expect(lastDates("2026-03-01", 3)).toEqual([
      "2026-02-27",
      "2026-02-28",
      "2026-03-01",
    ]);
  });
});

describe("recentDays", () => {
  it("marque un jour sans partie, une partie en cours et une partie finie", () => {
    const finished = computeDayResult(
      { ...game(PICKS), date: "2026-11-29" },
      day(),
    );
    const playing = computeDayResult(
      { ...game([PICKS[0], ...Array(8).fill(null)]), date: "2026-11-30" },
      day({ complete: false }),
    );
    const recent = recentDays([finished, playing], "2026-11-30");
    expect(recent.days.slice(-3).map((d) => d.kind)).toEqual([
      "none",
      "finished",
      "unfinished",
    ]);
  });

  it("ne feuillette que les jours qui ont une partie", () => {
    const finished = computeDayResult(
      { ...game(PICKS), date: "2026-11-29" },
      day(),
    );
    expect(browsableDates(recentDays([finished], "2026-11-30"))).toEqual([
      "2026-11-29",
    ]);
  });

  it("ne fait pas de moyenne sans partie finie", () => {
    expect(recentDays([], "2026-11-30").average).toBeNull();
  });
});
