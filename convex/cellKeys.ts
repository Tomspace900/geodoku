import { v } from "convex/values";
import {
  CELL_KEYS,
  type CellKey,
} from "../src/features/game/logic/gridTopology";

export { CELL_KEYS, type CellKey };

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
