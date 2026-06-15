/**
 * Aggrégats par case — logique pure, ré-utilisée par la query admin et les
 * scripts d'export analytics.
 */

export type GuessRow = { countryCode: string; count: number };

export type CellMetric = {
  totalGuesses: number;
  distinctCountries: number;
  validAnswersCount: number;
  coverage: number;
  fillRate: number | null;
  observedDifficulty100: number | null;
  topAnswers: Array<{
    countryCode: string;
    count: number;
    share: number;
  }>;
  missingCountries: string[];
};

const TOP_ANSWERS_LIMIT = 5;

/**
 * Proxy « joueurs ayant engagé » : max des remplissages réussis sur les 9 cases.
 * Couvre les abandons en cours de partie (comptés dans totalGuesses, pas dans
 * wins+losses). Une case isolée peut dépasser ce max si un joueur remplit deux
 * fois la même case — cas rare, négligeable en analytics.
 */
export function computePlayersEngaged(
  totalGuessesPerCell: ReadonlyArray<number>,
): number {
  return totalGuessesPerCell.reduce((max, n) => Math.max(max, n), 0);
}

export function computeCellMetric(input: {
  validForCell: ReadonlyArray<string>;
  totalGuesses: number;
  guessRows: ReadonlyArray<GuessRow>;
  playersEngaged: number;
}): CellMetric {
  const { validForCell, totalGuesses, guessRows, playersEngaged } = input;

  const sortedRows = [...guessRows].sort((a, b) => b.count - a.count);
  const topAnswers = sortedRows.slice(0, TOP_ANSWERS_LIMIT).map((row) => ({
    countryCode: row.countryCode,
    count: row.count,
    share: totalGuesses > 0 ? row.count / totalGuesses : 0,
  }));

  const chosen = new Set(guessRows.map((row) => row.countryCode));
  const missingCountries = validForCell.filter((code) => !chosen.has(code));

  const validAnswersCount = validForCell.length;
  const distinctCountries = chosen.size;
  const coverage =
    validAnswersCount === 0 ? 0 : distinctCountries / validAnswersCount;

  const fillRate = playersEngaged === 0 ? null : totalGuesses / playersEngaged;
  const observedDifficulty100 =
    fillRate === null
      ? null
      : Math.max(0, Math.min(100, Math.round((1 - fillRate) * 100)));

  return {
    totalGuesses,
    distinctCountries,
    validAnswersCount,
    coverage,
    fillRate,
    observedDifficulty100,
    topAnswers,
    missingCountries,
  };
}

/**
 * Index de concentration : part du top-1. Proxy simple d'Herfindahl pour
 * signaler les cases dominées par une réponse "évidente". 0 si vide.
 */
export function concentrationIndex(
  topAnswers: ReadonlyArray<{ share: number }>,
): number {
  return topAnswers[0]?.share ?? 0;
}
