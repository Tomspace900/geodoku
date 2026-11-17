import type { Locale } from "../../../i18n/types";
import type { ConstraintId } from "../../game/logic/constraints";
import type { CellKey } from "../../game/logic/gridTopology";
import type { GameModeId } from "../../game/types";

/** Longueur maximale du texte d'un signalement, après nettoyage. */
export const REPORT_MESSAGE_MAX = 500;

/**
 * Page d'un signalement général, sans la langue (`/`, `/stats`,
 * `/archive/2026-11-14`). Le serveur refuse le reste ; le navigateur se
 * rabat sur `/` (`reportPage`).
 */
export const REPORT_PAGE_PATTERN = /^\/[A-Za-z0-9/_-]{0,119}$/;

/** La page à joindre : le chemin sans la langue, ou `/` s'il sort du motif. */
export function reportPage(pathWithoutLocale: string): string {
  const trimmed =
    pathWithoutLocale.length > 1
      ? pathWithoutLocale.replace(/\/+$/, "")
      : pathWithoutLocale;
  return REPORT_PAGE_PATTERN.test(trimmed) ? trimmed : "/";
}

/** « Réponse ou contrainte » ou « Bug ou autre ». */
export type ReportCategory = "content" | "bug";

/**
 * Ce que le signalement vise, rempli par l'entrée et jamais par le joueur :
 * une case ou une contrainte de la grille solution, ou rien de précis (pied
 * de page), avec la page d'où il part, sans la langue.
 */
export type ReportTarget =
  | { kind: "cell"; date: string; mode: GameModeId; cellKey: CellKey }
  | {
      kind: "constraint";
      date: string;
      mode: GameModeId;
      constraintId: ConstraintId;
    }
  | { kind: "general"; page: string };

/** Nature présélectionnée : une cible de grille parle de contenu, le reste de bug. */
export function defaultReportCategory(target: ReportTarget): ReportCategory {
  return target.kind === "general" ? "bug" : "content";
}

/** Contrôles C0 hors tabulation et saut de ligne, DEL et contrôles C1. */
function isControlCharacter(code: number): boolean {
  return (
    (code < 0x20 && code !== 0x09 && code !== 0x0a) ||
    (code >= 0x7f && code <= 0x9f)
  );
}

/**
 * Texte tel qu'il est enregistré : sans caractères de contrôle, sans espaces
 * autour. Le même nettoyage côté navigateur (compteur, bouton d'envoi) et
 * côté serveur (validation).
 */
export function cleanReportMessage(raw: string): string {
  return Array.from(raw)
    .filter((char) => !isControlCharacter(char.codePointAt(0) ?? 0))
    .join("")
    .trim();
}

/**
 * « 16 novembre » / « November 16 » : la grille visée, sous le titre du
 * signalement. Midi évite qu'un fuseau fasse basculer le jour.
 */
export function formatReportGridDate(date: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
    day: "numeric",
    month: "long",
  }).format(new Date(`${date}T12:00:00`));
}
