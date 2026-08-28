/**
 * Adaptateur Convex des grilles.
 *
 * Ce module conserve les chemins publics et internes historiques. Les
 * implémentations vivent derrière trois modules profonds : parcours joueur,
 * lecture/commandes admin et opérations de pool.
 */
import { action, internalAction, mutation, query } from "./_generated/server";
import {
  adminTokenArgs,
  candidatePreviewDetailArgs,
  deletePoolCandidateArgs,
  deletePoolCandidateHandler,
  deleteScheduledGridHandler,
  getCandidatePreviewDetailHandler,
  getGridCellMetricsHandler,
  getGridFeedbackStatsHandler,
  getPoolStatsHandler,
  getScheduledGridPreviewDetailHandler,
  getScheduledGridsHandler,
  getUpcomingScheduledPreviewHandler,
  gridCellMetricsArgs,
  gridFeedbackStatsArgs,
  refreshPoolHandler,
  retryPoolFinalizationHandler,
  runEnsureTomorrowHandler,
  scheduleCandidateForDateArgs,
  scheduleCandidateForDateHandler,
  scheduledGridPreviewDetailArgs,
  scheduleGridForDateArgs,
  scheduleGridForDateHandler,
  unscheduleGridHandler,
  upcomingScheduledPreviewArgs,
} from "./adminGridOperations";
import {
  getReplayableGridsHandler,
  getReplayGridArgs,
  getReplayGridHandler,
  getTodayGridHandler,
  recordTodayGameEndArgs,
  recordTodayGameEndHandler,
  replayableGridsReturns,
  replayGridReturns,
  submitTodayGridFeedbackArgs,
  submitTodayGridFeedbackHandler,
  todayGridReturns,
} from "./gridGameplay";
import { recordedResult } from "./operationResults";
import {
  reconcileFutureGridContentHandler,
  reconcilePoolAndScheduleArgs,
  reconcilePoolAndScheduleHandler,
} from "./poolOperations";

export type { FutureGridContentReconciliation } from "./poolOperations";
export {
  generatePoolImpl,
  reconcileFutureGridContentImpl,
  reconcilePoolAndScheduleImpl,
  refreshPoolImpl,
} from "./poolOperations";

// ─── Workflows internes ──────────────────────────────────────────────────────

export const reconcileFutureGridContent = internalAction({
  args: {},
  handler: reconcileFutureGridContentHandler,
});

export const reconcilePoolAndSchedule = internalAction({
  args: reconcilePoolAndScheduleArgs,
  handler: reconcilePoolAndScheduleHandler,
});

// ─── Parcours joueur ─────────────────────────────────────────────────────────

export const getTodayGrid = query({
  args: {},
  returns: todayGridReturns,
  handler: getTodayGridHandler,
});

/** Archive du mode entraînement : les grilles de J-1 à J-7, sans leurs réponses. */
export const getReplayableGrids = query({
  args: {},
  returns: replayableGridsReturns,
  handler: getReplayableGridsHandler,
});

/**
 * Grille passée rejouable, avec ses réponses. Bornée à J-1..J-7 côté serveur :
 * c'est ce garde, et non le frontend, qui empêche de lire une grille future.
 */
export const getReplayGrid = query({
  args: getReplayGridArgs,
  returns: replayGridReturns,
  handler: getReplayGridHandler,
});

export const recordTodayGameEnd = mutation({
  args: recordTodayGameEndArgs,
  returns: recordedResult,
  handler: recordTodayGameEndHandler,
});

export const submitTodayGridFeedback = mutation({
  args: submitTodayGridFeedbackArgs,
  returns: recordedResult,
  handler: submitTodayGridFeedbackHandler,
});

// ─── Read model admin ────────────────────────────────────────────────────────

export const getScheduledGrids = query({
  args: adminTokenArgs,
  handler: getScheduledGridsHandler,
});

export const getScheduledGridPreviewDetail = query({
  args: scheduledGridPreviewDetailArgs,
  handler: getScheduledGridPreviewDetailHandler,
});

export const getCandidatePreviewDetail = query({
  args: candidatePreviewDetailArgs,
  handler: getCandidatePreviewDetailHandler,
});

export const getPoolStats = query({
  args: adminTokenArgs,
  handler: getPoolStatsHandler,
});

export const getUpcomingScheduledPreview = query({
  args: upcomingScheduledPreviewArgs,
  handler: getUpcomingScheduledPreviewHandler,
});

export const getGridFeedbackStats = query({
  args: gridFeedbackStatsArgs,
  handler: getGridFeedbackStatsHandler,
});

export const getGridCellMetrics = query({
  args: gridCellMetricsArgs,
  handler: getGridCellMetricsHandler,
});

// ─── Commandes admin ─────────────────────────────────────────────────────────

export const refreshPool = action({
  args: adminTokenArgs,
  handler: refreshPoolHandler,
});

export const retryPoolFinalization = action({
  args: adminTokenArgs,
  handler: retryPoolFinalizationHandler,
});

export const runEnsureTomorrow = action({
  args: adminTokenArgs,
  handler: runEnsureTomorrowHandler,
});

export const scheduleGridForDate = action({
  args: scheduleGridForDateArgs,
  handler: scheduleGridForDateHandler,
});

export const scheduleCandidateForDate = action({
  args: scheduleCandidateForDateArgs,
  handler: scheduleCandidateForDateHandler,
});

export const unscheduleGrid = action({
  args: scheduleGridForDateArgs,
  handler: unscheduleGridHandler,
});

export const deleteScheduledGrid = action({
  args: scheduleGridForDateArgs,
  handler: deleteScheduledGridHandler,
});

export const deletePoolCandidate = action({
  args: deletePoolCandidateArgs,
  handler: deletePoolCandidateHandler,
});
