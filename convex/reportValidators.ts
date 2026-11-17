import { v } from "convex/values";
import { cellKeyValidator } from "./cellKeys";

/** Validateurs des signalements (#127), partagés par le schéma et les fonctions. */

export const reportCategoryValidator = v.union(
  v.literal("content"),
  v.literal("bug"),
);

export const reportStatusValidator = v.union(
  v.literal("new"),
  v.literal("resolved"),
  v.literal("dismissed"),
);

const gameModeValidator = v.union(v.literal("daily"), v.literal("training"));

/** Ce que vise le signalement : une case, une contrainte, ou une page. */
export const reportTargetValidator = v.union(
  v.object({
    kind: v.literal("cell"),
    date: v.string(),
    mode: gameModeValidator,
    cellKey: cellKeyValidator,
  }),
  v.object({
    kind: v.literal("constraint"),
    date: v.string(),
    mode: gameModeValidator,
    constraintId: v.string(),
  }),
  v.object({ kind: v.literal("general"), page: v.string() }),
);

export type ReportStatus = typeof reportStatusValidator.type;
export type ReportTargetDoc = typeof reportTargetValidator.type;
