import type { Locale } from "@/i18n/types";
import { STORAGE_KEYS, safeGet, safeSet } from "@/lib/storage";

/**
 * Pilotage du lien vers le sondage joueurs (Google Forms).
 *
 * L'affichage est gouverné par le feature flag PostHog `SURVEY_FLAG` : on
 * l'allume/éteint en un clic dans le dashboard PostHog, sans redéploiement.
 * Les URLs vivent ici pour n'avoir qu'un seul endroit à toucher.
 */
export const SURVEY_FLAG = "survey_active";

/**
 * Identifiant du sondage en ligne, à changer avec ses URLs. L'interaction
 * mémorisée porte cet identifiant : un joueur qui a cliqué sur un sondage
 * précédent revoit donc la banderole pour le nouveau.
 */
export const SURVEY_ID = "2026-10-suivi";

/**
 * Nombre de jours où un joueur peut fermer la banderole avant qu'elle ne
 * revienne plus pour ce sondage. Le lien du footer, lui, reste.
 */
export const MAX_SURVEY_DISMISSALS = 3;

/**
 * Clé localStorage mémorisant l'interaction avec le CTA sondage (JSON,
 * cf. `SurveyDoneState`). Un clic masque le CTA définitivement (le joueur a
 * déjà répondu ou décliné en connaissance de cause) ; une fermeture ne le
 * masque que pour le jour courant, jusqu'à `MAX_SURVEY_DISMISSALS` fermetures —
 * pour ne pas perdre les joueurs qui ferment par réflexe sans relancer à
 * l'infini ceux qui ont décidé.
 */
export const SURVEY_DONE_KEY = STORAGE_KEYS.surveyDone;

export type SurveyDoneState =
  | { surveyId: string; kind: "clicked" }
  | { surveyId: string; kind: "dismissed"; date: string; count: number };

const surveyDoneListeners = new Set<() => void>();

function notifySurveyDoneListeners(): void {
  surveyDoneListeners.forEach((listener) => {
    listener();
  });
}

export function getSurveyDoneSnapshot(): string | null {
  return safeGet(SURVEY_DONE_KEY);
}

export function subscribeSurveyDone(listener: () => void): () => void {
  surveyDoneListeners.add(listener);

  function handleStorage(event: StorageEvent): void {
    if (event.key === SURVEY_DONE_KEY) listener();
  }

  if (typeof window !== "undefined") {
    window.addEventListener("storage", handleStorage);
  }

  return () => {
    surveyDoneListeners.delete(listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", handleStorage);
    }
  };
}

function persistSurveyDone(state: SurveyDoneState): void {
  safeSet(SURVEY_DONE_KEY, serializeSurveyDone(state));
  notifySurveyDoneListeners();
}

/**
 * État du sondage en cours, ou `null` s'il est absent, corrompu ou propre à
 * un autre sondage (y compris l'ancien format sans identifiant).
 */
function parseCurrentSurveyDone(raw: string | null): SurveyDoneState | null {
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SurveyDoneState> | null;
    return parsed?.surveyId === SURVEY_ID ? (parsed as SurveyDoneState) : null;
  } catch {
    return null;
  }
}

export function markSurveyClicked(): void {
  persistSurveyDone({ surveyId: SURVEY_ID, kind: "clicked" });
}

export function markSurveyDismissed(date: string): void {
  const previous = parseCurrentSurveyDone(getSurveyDoneSnapshot());
  const previousCount = previous?.kind === "dismissed" ? previous.count : 0;
  // Deux fermetures le même jour (deux onglets) ne comptent qu'une fois.
  const sameDay = previous?.kind === "dismissed" && previous.date === date;
  persistSurveyDone({
    surveyId: SURVEY_ID,
    kind: "dismissed",
    date,
    count: sameDay ? previousCount : previousCount + 1,
  });
}

export function serializeSurveyDone(state: SurveyDoneState): string {
  return JSON.stringify(state);
}

/**
 * `today` = date du jour (`YYYY-MM-DD`, cf. `todayUTC`), à fournir par l'appelant
 * pour rester une fonction pure testable.
 */
export function isSurveyDone(raw: string | null, today: string): boolean {
  const state = parseCurrentSurveyDone(raw);
  if (state === null) return false;
  if (state.kind === "clicked") return true;
  return state.count >= MAX_SURVEY_DISMISSALS || state.date === today;
}

const SURVEY_URLS: Record<Locale, string> = {
  fr: "https://docs.google.com/forms/d/e/1FAIpQLSdSABTzw_4ZTntVkJG8L_4JKd1DmpSlH3hqAR7pVh54zcaY1g/viewform",
  en: "https://docs.google.com/forms/d/e/1FAIpQLSc0QIKxDQj7mdxmVta83RYUIW7AhH8Deg6tP2DAxjzCckHb2Q/viewform",
};

export function surveyUrl(locale: Locale): string {
  return SURVEY_URLS[locale];
}
