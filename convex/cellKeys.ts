import { type Validator, v } from "convex/values";
import {
  CELL_KEYS,
  type CellKey,
} from "../src/features/game/logic/gridTopology";

export { CELL_KEYS, type CellKey };

/**
 * Objet dont les 9 clés de cases sont toutes requises, pour les `returns:` des
 * read models indexés par case.
 */
export function cellKeyedObject<
  T extends Validator<unknown, "required", string>,
>(value: T) {
  return v.object(
    Object.fromEntries(CELL_KEYS.map((key) => [key, value])) as Record<
      CellKey,
      T
    >,
  );
}

/** Validateur Convex fermé : aucune coordonnée hors grille n'atteint le handler. */
export const cellKeyValidator = v.union(
  v.literal("0,0"),
  v.literal("0,1"),
  v.literal("0,2"),
  v.literal("1,0"),
  v.literal("1,1"),
  v.literal("1,2"),
  v.literal("2,0"),
  v.literal("2,1"),
  v.literal("2,2"),
);
