import type { TKey } from "@/i18n/types";

// Titre de fin personnalisé : une banque de formules piochée avec un peu
// d'aléatoire (côté composant) pour varier la fin de partie — palier de score en
// victoire, consolation en défaite. Module pur — les libellés vivent dans l'i18n
// (`result.*`), on n'en manipule ici que les clés.

export type WinTitleBand = "legendary" | "great" | "good" | "solid";

/**
 * Palier de titre selon le score total (/1000). Une victoire vaut au moins la
 * grille pleine (450) ; les paliers montent avec la rareté et les vies.
 */
export function winTitleBand(total: number): WinTitleBand {
  if (total >= 850) return "legendary";
  if (total >= 700) return "great";
  if (total >= 550) return "good";
  return "solid";
}

/** Clés i18n candidates par palier (la pioche aléatoire se fait côté composant). */
export const WIN_TITLE_KEYS: Record<WinTitleBand, TKey[]> = {
  legendary: [
    "result.legendary1",
    "result.legendary2",
    "result.legendary3",
    "result.legendary4",
    "result.legendary5",
    "result.legendary6",
  ],
  great: [
    "result.great1",
    "result.great2",
    "result.great3",
    "result.great4",
    "result.great5",
    "result.great6",
  ],
  good: [
    "result.good1",
    "result.good2",
    "result.good3",
    "result.good4",
    "result.good5",
    "result.good6",
  ],
  solid: [
    "result.solid1",
    "result.solid2",
    "result.solid3",
    "result.solid4",
    "result.solid5",
    "result.solid6",
  ],
};

/** Défaite par épuisement des vies : formules de consolation (pioche aléatoire). */
export const LIVES_DEFEAT_KEYS: TKey[] = [
  "result.livesDefeat1",
  "result.livesDefeat2",
  "result.livesDefeat3",
  "result.livesDefeat4",
  "result.livesDefeat5",
  "result.livesDefeat6",
];

/** Défaite par blocage (rare) : un seul libellé. */
export const BLOCKED_TITLE_KEYS: TKey[] = ["result.blocked"];

/** Issue de partie qui détermine le titre de fin. */
export type ResultOutcome =
  | { status: "won"; total: number }
  | { status: "lostByLives" }
  | { status: "lostByBlock" };

/**
 * Clés candidates pour le titre de fin selon l'issue. Le composant en pioche une
 * au hasard (une liste à un seul élément — le blocage — renvoie toujours la même).
 */
export function resultTitleKeys(outcome: ResultOutcome): TKey[] {
  switch (outcome.status) {
    case "won":
      return WIN_TITLE_KEYS[winTitleBand(outcome.total)];
    case "lostByBlock":
      return BLOCKED_TITLE_KEYS;
    case "lostByLives":
      return LIVES_DEFEAT_KEYS;
  }
}
