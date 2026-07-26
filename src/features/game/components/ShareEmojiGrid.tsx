import { cellShareEmoji } from "@/features/game/logic/share";
import type {
  Cell,
  CellGuessDistribution,
  CellKey,
} from "@/features/game/types";
import { GRID_INDICES } from "./GridMatrix";

type Props = {
  cells: Record<CellKey, Cell>;
  distribution: Record<string, CellGuessDistribution> | undefined;
  /** Légende sous la grille (`#GEODOKU #53`, date d'une grille passée…). */
  caption?: string;
};

/**
 * Rendu à l'écran de la grille d'emojis de partage, commun aux deux écrans de
 * résultat. Le texte réellement copié est produit par `logic/share.ts` : les
 * deux s'appuient sur le même `cellShareEmoji`, donc restent d'accord.
 */
export function ShareEmojiGrid({ cells, distribution, caption }: Props) {
  return (
    <div className="flex flex-col items-center gap-1">
      {GRID_INDICES.map((row) => (
        <div key={row} className="flex gap-1">
          {GRID_INDICES.map((col) => {
            const key = `${row},${col}` as CellKey;
            return (
              <span
                key={col}
                className="text-2xl leading-none w-9 h-9 flex items-center justify-center"
              >
                {cellShareEmoji(cells[key], distribution?.[key])}
              </span>
            );
          })}
        </div>
      ))}
      {caption && (
        <p className="text-xs text-on-surface-variant mt-1">{caption}</p>
      )}
    </div>
  );
}
