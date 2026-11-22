import posthog, { type PostHog } from "posthog-js";
import type { AnalyticsOptions } from "@/app/analytics";
import { dropNoiseExceptions } from "@/app/analyticsNoise";

/** Chunk chargé à la demande par `startAnalytics` (#180), jamais importé en statique. */
export function initPostHog({ token, apiHost }: AnalyticsOptions): PostHog {
  posthog.init(token, {
    api_host: apiHost,
    defaults: "2026-01-30",
    autocapture: false,
    // Identifiant anonyme stocké en localStorage uniquement : aucun cookie posé,
    // donc pas de bandeau de consentement requis (cf. /privacy).
    persistence: "localStorage",
    before_send: dropNoiseExceptions,
  });
  return posthog;
}
