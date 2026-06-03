/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as cellKeys from "../cellKeys.js";
import type * as crons from "../crons.js";
import type * as gridData from "../gridData.js";
import type * as grids from "../grids.js";
import type * as guesses from "../guesses.js";
import type * as http from "../http.js";
import type * as lib_cellMetrics from "../lib/cellMetrics.js";
import type * as lib_dates from "../lib/dates.js";
import type * as lib_gridConstants from "../lib/gridConstants.js";
import type * as lib_gridGenerator from "../lib/gridGenerator.js";
import type * as lib_gridScheduler from "../lib/gridScheduler.js";
import type * as rateLimit from "../rateLimit.js";
import type * as scheduling from "../scheduling.js";
import type * as seed from "../seed.js";
import type * as wipe from "../wipe.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  cellKeys: typeof cellKeys;
  crons: typeof crons;
  gridData: typeof gridData;
  grids: typeof grids;
  guesses: typeof guesses;
  http: typeof http;
  "lib/cellMetrics": typeof lib_cellMetrics;
  "lib/dates": typeof lib_dates;
  "lib/gridConstants": typeof lib_gridConstants;
  "lib/gridGenerator": typeof lib_gridGenerator;
  "lib/gridScheduler": typeof lib_gridScheduler;
  rateLimit: typeof rateLimit;
  scheduling: typeof scheduling;
  seed: typeof seed;
  wipe: typeof wipe;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
};
