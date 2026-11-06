// Importé par Convex (`stats.getFinishedDay`) : imports relatifs seulement.
import type { CellCounts } from "../../game/logic/distribution";
import { CELL_KEYS, GRID_CELL_COUNT } from "../../game/logic/gridTopology";

/**
 * Un jour fini, tel que `stats.getFinishedDay` le renvoie (#155) : ses 6
 * contraintes, sa répartition finale et les réponses des cases qui peuvent
 * se bloquer. Il ne change plus : le navigateur le garde (`dayCache.ts`).
 */
export type FinishedDay = {
  date: string;
  rows: string[];
  cols: string[];
  counts: CellCounts;
  blockableAnswers: Record<string, string[]>;
};

/**
 * Une case vide n'est bloquée que si toutes ses réponses sont posées ailleurs,
 * sur les 8 autres cases au plus : une case de 9 réponses ou plus ne se bloque
 * jamais. Les autres réponses n'apprennent rien au blocage.
 */
export const MAX_BLOCKABLE_ANSWERS = GRID_CELL_COUNT - 1;

export function blockableAnswers(
  validAnswers: Record<string, string[]>,
): Record<string, string[]> {
  return Object.fromEntries(
    CELL_KEYS.flatMap((cellKey) => {
      const answers = validAnswers[cellKey] ?? [];
      return answers.length > 0 && answers.length <= MAX_BLOCKABLE_ANSWERS
        ? [[cellKey, answers]]
        : [];
    }),
  );
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ISO3_PATTERN = /^[A-Z]{3}$/;

function isStringArray(raw: unknown, pattern?: RegExp): raw is string[] {
  return (
    Array.isArray(raw) &&
    raw.every(
      (item) => typeof item === "string" && (!pattern || pattern.test(item)),
    )
  );
}

function isRecordOf<T>(
  raw: unknown,
  isValue: (value: unknown) => value is T,
): raw is Record<string, T> {
  return (
    !!raw &&
    typeof raw === "object" &&
    !Array.isArray(raw) &&
    Object.values(raw).every(isValue)
  );
}

function isCount(raw: unknown): raw is number {
  return typeof raw === "number" && Number.isInteger(raw) && raw >= 0;
}

/** Lecture tolérante d'un jour mis en cache : un jour douteux est écarté. */
export function sanitizeFinishedDay(raw: unknown): FinishedDay | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.date !== "string" || !DATE_PATTERN.test(o.date)) return null;
  if (!isStringArray(o.rows) || o.rows.length !== 3) return null;
  if (!isStringArray(o.cols) || o.cols.length !== 3) return null;
  const counts = o.counts;
  if (
    !isRecordOf(counts, (cell): cell is Record<string, number> =>
      isRecordOf(cell, isCount),
    )
  ) {
    return null;
  }
  const answers = o.blockableAnswers;
  if (
    !isRecordOf(answers, (cell): cell is string[] =>
      isStringArray(cell, ISO3_PATTERN),
    )
  ) {
    return null;
  }
  return {
    date: o.date,
    rows: o.rows,
    cols: o.cols,
    counts,
    blockableAnswers: answers,
  };
}
