/** Réponse de `reports.submit`. */
export type SubmitResult = "sent" | "duplicate" | "rate_limited";

/** Issue d'un envoi, telle que le formulaire la montre. */
export type ReportSendOutcome = "sent" | "rate_limited" | "failed";

/** Ce qui part dans l'event `report_submitted`. */
export type ReportSubmitEventOutcome = SubmitResult | "failed";

/**
 * Hors ligne, une mutation Convex attend le retour du réseau sans jamais
 * échouer : passé ce délai, on dit l'échec et le texte reste dans le champ.
 * Un nouvel essai garde le même `reportId` : si le premier envoi finit par
 * arriver, le second rend `duplicate`, sans doublon.
 */
export const SUBMIT_TIMEOUT_MS = 15_000;

/** Un renvoi déjà reçu (`duplicate`) est un succès pour le joueur. */
export function toSendOutcome(
  result: ReportSubmitEventOutcome,
): ReportSendOutcome {
  if (result === "sent" || result === "duplicate") return "sent";
  return result;
}

/** La promesse, ou `"timeout"` si elle tarde plus de `ms`. */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
): Promise<T | "timeout"> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<"timeout">((resolve) => {
    timer = setTimeout(() => resolve("timeout"), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
