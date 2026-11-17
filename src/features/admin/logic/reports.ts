import { type CellKey, cellPosition } from "@/features/game/logic/gridTopology";
import type { GameModeId } from "@/features/game/types";
import {
  formatReportGridDate,
  type ReportCategory,
} from "@/features/reports/logic/report";
import { constraintLabel } from "./display";

export type ReportStatus = "new" | "resolved" | "dismissed";

export const REPORT_STATUS_LABEL: Record<ReportStatus, string> = {
  new: "Nouveaux",
  resolved: "Traités",
  dismissed: "Rejetés",
};

export const REPORT_CATEGORY_LABEL: Record<ReportCategory, string> = {
  content: "Réponse ou contrainte",
  bug: "Bug ou autre",
};

/** La cible telle que stockée : l'id de contrainte n'y est qu'une chaîne. */
export type StoredReportTarget =
  | { kind: "cell"; date: string; mode: GameModeId; cellKey: CellKey }
  | { kind: "constraint"; date: string; mode: GameModeId; constraintId: string }
  | { kind: "general"; page: string };

/** Lignes et colonnes d'une grille, quand l'admin les connaît (30 derniers jours). */
export type GridConstraints = { rows: string[]; cols: string[] };

/**
 * La cible en clair : « Case Asie × Enclavé », « Contrainte Asie »,
 * « Page /stats ». Sans la grille (plus de 30 jours), la case garde ses
 * coordonnées.
 */
export function reportTargetLabel(
  target: StoredReportTarget,
  grid: GridConstraints | undefined,
): string {
  if (target.kind === "general") return `Page ${target.page}`;
  if (target.kind === "constraint") {
    return `Contrainte ${constraintLabel(target.constraintId)}`;
  }
  const { row, col } = cellPosition(target.cellKey);
  const rowId = grid?.rows[row];
  const colId = grid?.cols[col];
  return rowId && colId
    ? `Case ${constraintLabel(rowId)} × ${constraintLabel(colId)}`
    : `Case ligne ${row + 1}, colonne ${col + 1}`;
}

/** « Grille du 14 novembre », suivi de « entraînement » hors grille du jour. */
export function reportGridLine(target: StoredReportTarget): string | null {
  if (target.kind === "general") return null;
  const date = `Grille du ${formatReportGridDate(target.date, "fr")}`;
  return target.mode === "training" ? `${date} · entraînement` : date;
}

/** « 17 nov. 2026, 12:37 », heure de Paris. */
export function formatReportSentAt(timestamp: number): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  }).format(new Date(timestamp));
}
