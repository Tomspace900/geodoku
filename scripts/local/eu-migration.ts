import { CELL_KEYS } from "../../src/features/game/logic/gridTopology";

/**
 * Transformation de la bascule vers Convex en Europe (#70), pure et testée :
 * l'export de l'ancien déploiement entre, l'import du nouveau sort. Le même
 * code sert à la répétition sur develop et à la prod.
 *
 * - Gardées : le pool et les grilles (`gridCandidates`, `gridAnswers`,
 *   `grids`, `poolState`), sans leurs champs legacy, `_id` et `_creationTime`
 *   compris (les grilles pointent vers leurs candidates).
 * - `guesses` devient `cellStats` : un document par case et par jour, les
 *   comptes par pays. La rareté des jours passés et l'entraînement continuent.
 * - `dailyStats` et `gridFeedback` (victoires, causes, notes, erreurs par case)
 *   ne passent pas : ils partent dans un fichier hors du repo. Aucune partie
 *   n'est fabriquée à partir d'eux.
 * - `operationReceipts` et les lignes du rate limiter ne sont pas importés.
 */

export type ConvexDoc = Record<string, unknown>;
export type Tables = Record<string, ConvexDoc[]>;

export const KEPT_TABLES = [
  "gridCandidates",
  "gridAnswers",
  "grids",
  "poolState",
] as const;
const ARCHIVED_TABLES = ["dailyStats", "gridFeedback"] as const;
const DROPPED_TABLES = ["guesses", "operationReceipts"] as const;
const KNOWN_TABLES = new Set<string>([
  ...KEPT_TABLES,
  ...ARCHIVED_TABLES,
  ...DROPPED_TABLES,
]);

const LEGACY_CANDIDATE_METADATA = [
  "difficultyEstimate",
  "difficultyTags",
  "cellDifficulties",
] as const;

export type MigrationReport = {
  kept: Record<string, number>;
  cellStatsDocs: number;
  cellStatsDays: number;
  /** Somme des comptes avant et après : doivent être égales. */
  guessCountBefore: number;
  guessCountAfter: number;
  /** Lignes `guesses` écartées (rejeu, case hors grille, compte invalide). */
  skippedGuesses: number;
  archived: Record<string, number>;
};

export type MigrationOutput = {
  tables: Tables;
  adminStats: { tables: Record<string, ConvexDoc[]> };
  report: MigrationReport;
};

function omit(doc: ConvexDoc, keys: readonly string[]): ConvexDoc {
  return Object.fromEntries(
    Object.entries(doc).filter(([key]) => !keys.includes(key)),
  );
}

function stripLegacy(table: string, doc: ConvexDoc): ConvexDoc {
  if (table === "grids") return omit(doc, ["difficulty"]);
  if (table === "gridCandidates") {
    const metadata = doc.metadata as ConvexDoc;
    return { ...doc, metadata: omit(metadata, LEGACY_CANDIDATE_METADATA) };
  }
  return doc;
}

const CELL_KEY_SET = new Set<string>(CELL_KEYS);

function toCellStats(guesses: ConvexDoc[]): {
  docs: ConvexDoc[];
  skipped: number;
  countBefore: number;
} {
  const byCell = new Map<string, Record<string, number>>();
  let skipped = 0;
  let countBefore = 0;
  guesses.forEach((row) => {
    const { date, cellKey, countryCode, count, isReplay } = row;
    if (
      isReplay === true ||
      typeof date !== "string" ||
      typeof cellKey !== "string" ||
      !CELL_KEY_SET.has(cellKey) ||
      typeof countryCode !== "string" ||
      typeof count !== "number" ||
      !Number.isInteger(count) ||
      count <= 0
    ) {
      skipped += 1;
      return;
    }
    countBefore += count;
    const key = `${date}|${cellKey}`;
    const counts = byCell.get(key) ?? {};
    counts[countryCode] = (counts[countryCode] ?? 0) + count;
    byCell.set(key, counts);
  });

  const docs = [...byCell.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, counts]) => {
      const [date, cellKey] = key.split("|");
      return { date, cellKey, counts };
    });
  return { docs, skipped, countBefore };
}

export function transformExport(source: Tables): MigrationOutput {
  const unknown = Object.keys(source).filter(
    (table) => !KNOWN_TABLES.has(table),
  );
  if (unknown.length > 0) {
    // Une table inconnue serait perdue sans bruit : on s'arrête.
    throw new Error(`Tables inattendues dans l'export : ${unknown.join(", ")}`);
  }

  const tables: Tables = {};
  const kept: Record<string, number> = {};
  KEPT_TABLES.forEach((table) => {
    tables[table] = (source[table] ?? []).map((doc) => stripLegacy(table, doc));
    kept[table] = tables[table].length;
  });

  const cellStats = toCellStats(source.guesses ?? []);
  tables.cellStats = cellStats.docs;
  const guessCountAfter = cellStats.docs.reduce(
    (sum, doc) =>
      sum +
      Object.values(doc.counts as Record<string, number>).reduce(
        (a, b) => a + b,
        0,
      ),
    0,
  );

  const archived: Record<string, number> = {};
  const adminTables: Record<string, ConvexDoc[]> = {};
  ARCHIVED_TABLES.forEach((table) => {
    adminTables[table] = (source[table] ?? []).map((doc) => omit(doc, ["_id"]));
    archived[table] = adminTables[table].length;
  });

  return {
    tables,
    adminStats: { tables: adminTables },
    report: {
      kept,
      cellStatsDocs: cellStats.docs.length,
      cellStatsDays: new Set(cellStats.docs.map((doc) => doc.date)).size,
      guessCountBefore: cellStats.countBefore,
      guessCountAfter,
      skippedGuesses: cellStats.skipped,
      archived,
    },
  };
}

/** Une ligne JSON par document, au format des exports Convex. */
export function parseJsonl(text: string): ConvexDoc[] {
  return text
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => JSON.parse(line) as ConvexDoc);
}

export function toJsonl(docs: readonly ConvexDoc[]): string {
  return (
    docs.map((doc) => JSON.stringify(doc)).join("\n") +
    (docs.length ? "\n" : "")
  );
}
