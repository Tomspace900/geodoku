import { describe, expect, it } from "vitest";
import { summarizeGames } from "./gameStats";

const ANSWERS: Record<string, string[]> = {
  "0,0": ["FRA"],
  "0,1": ["ITA"],
  "0,2": ["ESP"],
  "1,0": ["PRT"],
  "1,1": ["BEL"],
  "1,2": ["NLD"],
  "2,0": ["AUT"],
  "2,1": ["CHE"],
  "2,2": ["FRA"],
};
const NONE = [0, 0, 0, 0, 0, 0, 0, 0, 0];

describe("summarizeGames", () => {
  it("sépare victoires, défaites aux vies et blocages", () => {
    const stats = summarizeGames(
      [
        // Victoire impossible ici (FRA sert deux cases) : grille bloquée en 2,2.
        {
          cells: ["FRA", "ITA", "ESP", "PRT", "BEL", "NLD", "AUT", "CHE", null],
          failed: NONE,
        },
        { cells: Array(9).fill(null), failed: [5, 0, 0, 0, 0, 0, 0, 0, 0] },
        { cells: Array(9).fill(null), failed: NONE },
      ],
      ANSWERS,
    );
    expect({
      games: stats.games,
      wins: stats.wins,
      lostByLives: stats.lostByLives,
      lostByBlocked: stats.lostByBlocked,
      failedFirstCell: stats.failedByCell[0],
    }).toEqual({
      games: 3,
      wins: 0,
      lostByLives: 1,
      lostByBlocked: 1,
      failedFirstCell: 5,
    });
  });

  it("compte par case les joueurs trompés et les cases vides des parties finies, hors cases bloquées", () => {
    const stats = summarizeGames(
      [
        // Bloquée en 2,2 : la case n'est pas « laissée vide ».
        {
          cells: ["FRA", "ITA", "ESP", "PRT", "BEL", "NLD", "AUT", "CHE", null],
          failed: [0, 2, 0, 0, 0, 0, 0, 0, 0],
        },
        // Perdue aux vies : un joueur trompé en 0,0, quel que soit le nombre d'erreurs.
        { cells: Array(9).fill(null), failed: [5, 0, 0, 0, 0, 0, 0, 0, 0] },
        // En cours : ne compte pas.
        { cells: Array(9).fill(null), failed: [0, 0, 1, 0, 0, 0, 0, 0, 0] },
      ],
      ANSWERS,
    );
    expect({
      erred: stats.erredByCell,
      leftEmpty: stats.leftEmptyByCell,
    }).toEqual({
      erred: [1, 1, 0, 0, 0, 0, 0, 0, 0],
      leftEmpty: [1, 1, 1, 1, 1, 1, 1, 1, 1],
    });
  });
});
