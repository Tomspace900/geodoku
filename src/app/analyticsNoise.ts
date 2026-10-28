import type { CaptureResult } from "posthog-js";

/**
 * Hôtes de développement : leurs events partaient dans le projet PostHog de
 * prod (jeton dans `.env.local`) et déclenchaient l'alerte d'exceptions (#151).
 */
const DEV_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function isDevHostname(hostname: string): boolean {
  return DEV_HOSTNAMES.has(hostname) || hostname.endsWith(".localhost");
}

/**
 * Exceptions sur lesquelles on ne peut rien faire :
 * - `Script error.` : erreur levée par un script d'un autre domaine, dont le
 *   navigateur masque message et pile (extensions, navigateurs intégrés) ;
 * - `ResizeObserver loop` : avertissement bénin des navigateurs ;
 * - API d'extensions injectées dans la page (messagerie, portefeuilles crypto).
 */
const NOISE_MESSAGES = [
  /^Script error\.?$/,
  /^ResizeObserver loop/,
  /runtime\.sendMessage/,
  /window\.ethereum/,
];

const EXTENSION_FRAME = /^(chrome|moz|safari|safari-web)-extension:\/\//;

type ExceptionEntry = {
  value?: unknown;
  stacktrace?: { frames?: { filename?: unknown }[] };
};

function exceptionEntries(event: CaptureResult): ExceptionEntry[] {
  const list = event.properties?.$exception_list;
  return Array.isArray(list) ? (list as ExceptionEntry[]) : [];
}

function isNoiseEntry(entry: ExceptionEntry): boolean {
  const message = typeof entry.value === "string" ? entry.value : "";
  if (NOISE_MESSAGES.some((pattern) => pattern.test(message))) return true;
  return (entry.stacktrace?.frames ?? []).some(
    (frame) =>
      typeof frame.filename === "string" &&
      EXTENSION_FRAME.test(frame.filename),
  );
}

/** `before_send` PostHog : jette les exceptions de bruit, laisse passer le reste. */
export function dropNoiseExceptions(
  event: CaptureResult | null,
): CaptureResult | null {
  if (event?.event !== "$exception") return event;
  const entries = exceptionEntries(event);
  return entries.length > 0 && entries.every(isNoiseEntry) ? null : event;
}
