import type { Cell, CellGuessDistribution, CellKey, GameState } from "../types";
import { SHARE_EMOJIS, STARTING_LIVES } from "./constants";
import { livesRemaining } from "./lives";
import { filledCellTier } from "./rarity";
import { computeScore, computeScoreBreakdown } from "./scoreVariant";

/** Emoji de partage d'une case ; le tier de ta réponse (part brute cohorte, cf. `rarity.ts`). */
export function cellShareEmoji(
  cell: Cell,
  cellDist: CellGuessDistribution | undefined,
  cohortComplete = false,
): string {
  if (cell.status === "filled") {
    return SHARE_EMOJIS[
      filledCellTier(cell.countryCode, cellDist, cohortComplete) ?? "common"
    ];
  }
  if (cell.status === "blocked") return SHARE_EMOJIS.blocked;
  return SHARE_EMOJIS.failed;
}

/**
 * Chaîne copiée « partage » : format volontairement international, sans texte
 * localisable. Marque (Geodoku), numéro d’issue si post-lancement (`gridNumber`),
 * total en points, URL et emojis — pas d’i18n ici (`pts` est universel).
 *
 * Réservé à la grille du jour : le partage n'a de sens que quand tout le monde a
 * la même grille. Une partie d'entraînement (vies illimitées) n'affiche donc pas
 * de ligne de cœurs.
 */
export function formatShareString(
  state: GameState,
  gridNumber: number | null,
  distribution: Record<string, CellGuessDistribution> | undefined,
  siteUrl = "https://geodoku.app",
): string {
  const { total, gridValue, livesValue } = computeScore(
    computeScoreBreakdown(state, distribution),
  );
  const points = total ?? gridValue + livesValue;
  const remaining = livesRemaining(state.lives);
  const hearts =
    remaining === null
      ? ""
      : "❤️".repeat(remaining) + "🤍".repeat(STARTING_LIVES - remaining);

  let titleLine = gridNumber !== null ? `Geodoku #${gridNumber}` : "Geodoku";
  if (state.status === "won" && hearts) titleLine += ` ${hearts}`;
  else if (state.status === "lost") titleLine += " 💀";
  const scoreLine = `${points} pts`;
  const header = `${titleLine}\n${scoreLine}`;

  const rows: string[] = [];
  for (let i = 0; i < 3; i++) {
    let line = "";
    for (let j = 0; j < 3; j++) {
      const key = `${i},${j}` as CellKey;
      line += cellShareEmoji(state.cells[key], distribution?.[key]);
    }
    rows.push(line);
  }
  return [header, "", ...rows, "", siteUrl].join("\n");
}

async function copyShareToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

type SharePayload = {
  title: string;
  text: string;
  url: string;
};

function clipboardShareText(payload: SharePayload): string {
  return `${payload.text}\n\n${payload.url}`;
}

/** Données pour `navigator.share` (texte sans URL dupliquée en fin de corps). */
export function buildSharePayload(
  state: GameState,
  gridNumber: number | null,
  distribution: Record<string, CellGuessDistribution> | undefined,
  siteUrl = "https://geodoku.app",
): SharePayload {
  const fullText = formatShareString(state, gridNumber, distribution, siteUrl);
  const lines = fullText.split("\n");
  return {
    title: lines[0] ?? "Geodoku",
    text: lines.slice(0, -2).join("\n"),
    url: lines.at(-1) ?? siteUrl,
  };
}

/**
 * Vrai uniquement sur un appareil au pointeur principal tactile (mobile/tablette).
 * Desktop Safari et Chrome exposent pourtant `navigator.share`, mais y ouvrir une
 * feuille de partage système est déroutant : sur desktop on préfère le presse-papiers.
 */
function isTouchPrimaryDevice(): boolean {
  if (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0) {
    return true;
  }
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches
  );
}

/**
 * Indique si l’on doit proposer la feuille de partage native : l’API Web Share
 * existe **et** l’appareil est tactile (sinon presse-papiers — cf. desktop).
 */
export function canUseNativeShare(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    isTouchPrimaryDevice()
  );
}

function isNativeShareAvailable(data: ShareData): boolean {
  if (!canUseNativeShare()) {
    return false;
  }
  if (typeof navigator.canShare === "function") {
    try {
      return navigator.canShare(data);
    } catch {
      return false;
    }
  }
  return true;
}

export type ShareOutcome = "shared" | "copied" | "cancelled" | "failed";

/**
 * Ouvre la feuille de partage native (iOS/Android) si disponible,
 * sinon copie le texte dans le presse-papiers.
 */
export async function shareGameResult(
  state: GameState,
  gridNumber: number | null,
  distribution: Record<string, CellGuessDistribution> | undefined,
  siteUrl = "https://geodoku.app",
): Promise<ShareOutcome> {
  const payload = buildSharePayload(state, gridNumber, distribution, siteUrl);
  const shareData: ShareData = {
    title: payload.title,
    text: payload.text,
    url: payload.url,
  };

  if (isNativeShareAvailable(shareData)) {
    try {
      await navigator.share(shareData);
      return "shared";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return "cancelled";
      }
    }
  }

  const ok = await copyShareToClipboard(clipboardShareText(payload));
  return ok ? "copied" : "failed";
}
