import type { CellKey, GameState } from "../types";
import { SHARE_EMOJIS, STARTING_LIVES } from "./constants";
import { computeScore } from "./rarity";

/**
 * Chaîne copiée « partage » : format volontairement international, sans texte
 * localisable. Uniquement le nom de marque (Geodoku, sans accent), chiffres,
 * URL et emojis — pas d’i18n ici.
 */
export function formatShareString(
  state: GameState,
  gridNumber: number,
  siteUrl = "geodoku.app",
): string {
  const { percent } = computeScore(state);
  const hearts =
    "❤️".repeat(state.remainingLives) +
    "🤍".repeat(STARTING_LIVES - state.remainingLives);

  let header = `Geodoku #${gridNumber} — ${percent}%`;
  if (state.status === "won") header += ` ${hearts}`;
  else if (state.status === "lost") header += " 💀";

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
