import type { CellKey, GameState } from "../types";
import { SHARE_EMOJIS, STARTING_LIVES } from "./constants";
import { computeGridScore, computeOriginalityScore } from "./rarity";

/**
 * Chaîne copiée « partage » : format volontairement international, sans texte
 * localisable. Uniquement le nom de marque (Geodoku, sans accent), chiffres,
 * lettres ASCII (grade S/A/B/C/D), URL et emojis — pas d’i18n ici.
 */
export function formatShareString(
  state: GameState,
  gridNumber: number,
  siteUrl = "geodoku.app",
): string {
  const { percent } = computeGridScore(state);
  const { grade } = computeOriginalityScore(state);
  const hearts =
    "❤️".repeat(state.remainingLives) +
    "🤍".repeat(STARTING_LIVES - state.remainingLives);

  let titleLine = `Geodoku #${gridNumber}`;
  if (state.status === "won") titleLine += ` ${hearts}`;
  else if (state.status === "lost") titleLine += " 💀";
  const scoreLine = `${percent}% · ${grade}`;
  const header = `${titleLine}\n${scoreLine}`;

  const rows: string[] = [];
  for (let i = 0; i < 3; i++) {
    let line = "";
    for (let j = 0; j < 3; j++) {
      const cell = state.cells[`${i},${j}` as CellKey];
      line +=
        cell.status === "filled"
          ? SHARE_EMOJIS[cell.rarityTier]
          : SHARE_EMOJIS.failed;
    }
    rows.push(line);
  }
  return [header, "", ...rows, "", siteUrl].join("\n");
}

export async function copyShareToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
