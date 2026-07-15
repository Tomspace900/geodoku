import { CELL_KEYS } from "./gridTopology";

export { CELL_KEYS } from "./gridTopology";

/**
 * Résout la grille en assignant un pays distinct à chacune des 9 cases via
 * matching biparti (algorithme de Kuhn).
 */
export function solveGrid(
  validAnswers: Record<string, string[]>,
): Record<string, { code: string }> | null {
  const matchCountry: Record<string, string> = {};

  function assign(cellKey: string, seen: Set<string>): boolean {
    for (const code of validAnswers[cellKey] ?? []) {
      if (seen.has(code)) continue;
      seen.add(code);
      const heldBy = matchCountry[code];
      if (heldBy === undefined || assign(heldBy, seen)) {
        matchCountry[code] = cellKey;
        return true;
      }
    }
    return false;
  }

  for (const cellKey of CELL_KEYS) {
    if (!assign(cellKey, new Set())) return null;
  }

  const byCell: Record<string, { code: string }> = {};
  for (const [code, cellKey] of Object.entries(matchCountry)) {
    byCell[cellKey] = { code };
  }
  if (Object.keys(byCell).length !== CELL_KEYS.length) return null;
  return byCell;
}
