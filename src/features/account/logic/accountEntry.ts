// Importé par Convex (`account.syncAccount`) : imports relatifs seulement.
import { isBrowserUuidV4 } from "../../game/logic/browserUuid";
import { GRID_CELL_COUNT, STARTING_LIVES } from "../../game/logic/gridTopology";

/**
 * Une entrée du journal envoyée au rattachement (#155) : le format de la
 * ligne de partie, avec le jeton de la partie s'il existe. Le serveur ne fait
 * pas confiance au client : une entrée douteuse est simplement ignorée.
 */
export type AccountEntry = {
  date: string;
  cells: (string | null)[];
  failed: number[];
  token?: string;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ISO3_PATTERN = /^[A-Z]{3}$/;

function isCanonicalDate(date: string): boolean {
  if (!DATE_PATTERN.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date
  );
}

/**
 * Forme d'une ligne de partie possible : 9 cases (ISO3 distincts ou vides),
 * 9 compteurs d'erreurs entiers, au plus 5 erreurs, au moins un coup, une
 * date passée ou du jour. Le jeton, s'il est illisible, est seulement oublié.
 */
export function sanitizeAccountEntry(
  raw: AccountEntry,
  today: string,
): AccountEntry | null {
  if (!isCanonicalDate(raw.date) || raw.date > today) return null;
  if (raw.cells.length !== GRID_CELL_COUNT) return null;
  if (raw.failed.length !== GRID_CELL_COUNT) return null;
  if (!raw.cells.every((code) => code === null || ISO3_PATTERN.test(code))) {
    return null;
  }
  const placed = raw.cells.filter((code): code is string => code !== null);
  if (new Set(placed).size !== placed.length) return null;
  if (!raw.failed.every((n) => Number.isInteger(n) && n >= 0)) return null;
  const errors = raw.failed.reduce((sum, n) => sum + n, 0);
  if (errors > STARTING_LIVES) return null;
  if (placed.length === 0 && errors === 0) return null;
  return {
    date: raw.date,
    cells: [...raw.cells],
    failed: [...raw.failed],
    ...(isBrowserUuidV4(raw.token) ? { token: raw.token } : {}),
  };
}
