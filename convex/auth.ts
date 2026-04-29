import { ConvexError } from "convex/values";

/**
 * Constant-time string comparison.
 * Avoids timing side-channels when validating the admin token in V8 runtime
 * (Node's crypto.timingSafeEqual is not available in Convex queries).
 */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Throws ConvexError("Unauthorized") if the provided token does not match
 * the ADMIN_TOKEN environment variable. To be called as the first line of
 * any admin-only query/mutation/action.
 */
export function checkAdminToken(provided: string | undefined): void {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected || !provided || !safeEqual(provided, expected)) {
    throw new ConvexError("Unauthorized");
  }
}
