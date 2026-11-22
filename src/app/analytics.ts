import type { CaptureOptions, PostHog, Properties } from "posthog-js";
import { useSyncExternalStore } from "react";

/**
 * Façade PostHog (#180). posthog-js pèse plus que react-dom : il est chargé
 * après le premier rendu (`startAnalytics`), et les appels faits avant
 * attendent dans une file, rejouée dans l'ordre dès l'init. Sans PostHog
 * (preview sans jeton, dev, relais OAuth), `disableAnalytics` vide la file et
 * chaque appel devient un no-op.
 *
 * Seul le type de posthog-js est importé ici : le chunk initial ne doit pas en
 * dépendre (vérifié par `pnpm check:bundle`).
 */

type Call = (client: PostHog) => void;

export type AnalyticsOptions = {
  token: string;
  apiHost: string | undefined;
};

let client: PostHog | null = null;
let queue: Call[] | null = [];
const flagListeners = new Set<() => void>();

function run(call: Call) {
  if (client) call(client);
  else queue?.push(call);
}

export const analytics = {
  capture(event: string, properties?: Properties, options?: CaptureOptions) {
    run((c) => c.capture(event, properties, options));
  },
  register(properties: Properties) {
    run((c) => c.register(properties));
  },
  captureException(error: unknown, properties?: Properties) {
    run((c) => c.captureException(error, properties));
  },
};

export type Analytics = typeof analytics;

/** Hook de confort : la façade est un module, toujours la même référence. */
export function useAnalytics(): Analytics {
  return analytics;
}

// Une exception levée avant le chargement de posthog-js n'a pas encore son
// autocapture : on l'attrape ici, elle part avec la file.
function onEarlyError(event: ErrorEvent) {
  analytics.captureException(event.error ?? event.message);
}
function onEarlyRejection(event: PromiseRejectionEvent) {
  analytics.captureException(event.reason);
}

function removeEarlyListeners() {
  window.removeEventListener("error", onEarlyError);
  window.removeEventListener("unhandledrejection", onEarlyRejection);
}

/** À appeler avant le rendu quand PostHog est actif. */
export function watchEarlyErrors() {
  window.addEventListener("error", onEarlyError);
  window.addEventListener("unhandledrejection", onEarlyRejection);
}

/** PostHog absent : la file est jetée, les appels suivants ne font rien. */
export function disableAnalytics() {
  queue = null;
  removeEarlyListeners();
}

/** Branche un client initialisé et rejoue la file (exporté pour les tests). */
export function attachAnalyticsClient(instance: PostHog) {
  removeEarlyListeners();
  client = instance;
  const pending = queue ?? [];
  queue = null;
  pending.forEach((call) => {
    call(instance);
  });
  instance.onFeatureFlags(notifyFlagListeners);
  notifyFlagListeners();
}

function notifyFlagListeners() {
  flagListeners.forEach((listener) => {
    listener();
  });
}

/**
 * Charge posthog-js hors du chemin critique : après l'événement `load`, quand
 * le navigateur a fini la page. Le pageview initial et les Web Vitals restent
 * captés (le pageview part à l'init, les Web Vitals sont tamponnés).
 */
export function startAnalytics(options: AnalyticsOptions) {
  const load = () => {
    import("@/app/posthogClient")
      .then(({ initPostHog }) => {
        attachAnalyticsClient(initPostHog(options));
      })
      .catch(() => {
        // Bloqueur de pub ou réseau coupé : le jeu continue sans mesure.
        disableAnalytics();
      });
  };
  if (document.readyState === "complete") load();
  else window.addEventListener("load", load, { once: true });
}

function subscribeFlags(listener: () => void) {
  flagListeners.add(listener);
  return () => {
    flagListeners.delete(listener);
  };
}

function readFlag(flag: string): boolean | undefined {
  // Lu à chaque rendu : sans `$feature_flag_called`, qu'aucune expérience ne lit.
  return client?.isFeatureEnabled(flag, { send_event: false });
}

/** Valeur d'un feature flag ; `undefined` tant que PostHog n'a pas répondu. */
export function useFeatureFlagEnabled(flag: string): boolean | undefined {
  return useSyncExternalStore(
    subscribeFlags,
    () => readFlag(flag),
    () => undefined,
  );
}
