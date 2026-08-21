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
 * Chaîne de partage **unique** — feuille native comme presse-papiers envoient
 * exactement celle-ci (cf. `shareGameResult`). Format volontairement international,
 * sans texte localisable. Marque (Geodoku), numéro d’issue si post-lancement
 * (`gridNumber`), total en points, emojis et URL — pas d’i18n ici (`pts` est universel).
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

export type ShareOutcome = "shared" | "copied" | "cancelled" | "failed";

/**
 * Ouvre la feuille de partage native (iOS/Android) si disponible, sinon copie
 * dans le presse-papiers — **la même chaîne dans les deux cas**.
 *
 * ⚠️ Un seul champ `text` (URL comprise, en fin de corps), jamais
 * `{title, text, url}` : la feuille iOS transmet chaque champ comme un item
 * distinct et l’app réceptrice ne garde souvent que celui qu’elle sait traiter.
 * Avec une `url` séparée, Messages/WhatsApp/Mail n’envoyaient que le lien — score
 * et grille d’emojis passaient à la trappe, de façon variable selon l’app cible
 * (d’où l’impression que « ça dépend du navigateur »). Ne pas « enrichir » ce
 * payload : l’aperçu de lien qu’on y gagnerait ne vaut pas le contenu perdu.
 */
export async function shareGameResult(
  state: GameState,
  gridNumber: number | null,
  distribution: Record<string, CellGuessDistribution> | undefined,
  siteUrl = "https://geodoku.app",
): Promise<ShareOutcome> {
  const text = formatShareString(state, gridNumber, distribution, siteUrl);

  if (canUseNativeShare()) {
    try {
      await navigator.share({ text });
      return "shared";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return "cancelled";
      }
    }
  }

  const ok = await copyShareToClipboard(text);
  return ok ? "copied" : "failed";
}
