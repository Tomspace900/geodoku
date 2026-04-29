import { MINUTE, RateLimiter } from "@convex-dev/rate-limiter";
import { components } from "./_generated/api";

/**
 * Rate limits for public mutations.
 *
 * Keyed by `clientId` (a UUID stored in the player's localStorage). This is
 * not bot-proof — a determined attacker can rotate clientIds — but it blocks
 * naive scripts and caps the Convex bill in a brute-force scenario.
 *
 * - guess: token bucket so a player who plays a normal game (≤ 12 submits)
 *   never feels constrained, but bursts above 90 are rejected.
 * - feedback: a player submits exactly 1 feedback per grid in the UI, but we
 *   leave headroom for a few accidental retries.
 */
export const rateLimiter = new RateLimiter(components.rateLimiter, {
  guess: { kind: "token bucket", rate: 60, period: MINUTE, capacity: 90 },
  feedback: { kind: "token bucket", rate: 5, period: MINUTE, capacity: 10 },
});
