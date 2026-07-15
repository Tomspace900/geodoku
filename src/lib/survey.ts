import type { Locale } from "@/i18n/types";
import {
  LEGACY_SURVEY_DISMISSED_DATE,
  STORAGE_KEYS,
  safeGet,
  safeSet,
} from "@/lib/storage";

/**
 * Pilotage du lien vers le sondage joueurs (Google Forms).
 *
 * L'affichage est gouverné par le feature flag PostHog `SURVEY_FLAG` : on
 * l'allume/éteint en un clic dans le dashboard PostHog, sans redéploiement.
 * Les URLs vivent ici pour n'avoir qu'un seul endroit à toucher.
 */
export const SURVEY_FLAG = "survey_active";

/**
 * Clé localStorage mémorisant l'interaction avec le CTA sondage (JSON,
 * cf. `SurveyDoneState`). Un clic masque le CTA définitivement (le joueur a
 * déjà répondu ou décliné en connaissance de cause) ; une fermeture ne le
 * masque que pour le jour courant — le CTA revient le jour suivant, pour ne
 * pas perdre les joueurs qui ferment par réflexe sans avoir décidé.
 */
export const SURVEY_DONE_KEY = STORAGE_KEYS.surveyDone;

export type SurveyDoneState =
  | { kind: "clicked" }
  | { kind: "dismissed"; date: string };

const surveyDoneListeners = new Set<() => void>();

function notifySurveyDoneListeners(): void {
  surveyDoneListeners.forEach((listener) => listener());
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

export function markSurveyClicked(): void {
  persistSurveyDone({ kind: "clicked" });
}

export function markSurveyDismissed(date: string): void {
  persistSurveyDone({ kind: "dismissed", date });
}

export function serializeSurveyDone(state: SurveyDoneState): string {
  return JSON.stringify(state);
}

/**
 * `today` = date du jour (`YYYY-MM-DD`, cf. `todayUTC`), à fournir par l'appelant
 * pour rester une fonction pure testable.
 */
export function isSurveyDone(raw: string | null, today: string): boolean {
  if (raw === null) return false;
  // Ancien format (avant dissociation clic/dismiss) : simple flag "1". La
  // migration le réécrit au boot ; ce fallback garde le même comportement si la
  // valeur brute arrive malgré tout jusqu'ici.
  if (raw === "1") return today === LEGACY_SURVEY_DISMISSED_DATE;
  try {
    const parsed = JSON.parse(raw) as Partial<SurveyDoneState>;
    if (parsed.kind === "clicked") return true;
    if (parsed.kind === "dismissed") return parsed.date === today;
  } catch {
    // JSON corrompu → on ne bloque pas l'affichage du CTA.
  }
  return false;
}

const SURVEY_URLS: Record<Locale, string> = {
  fr: "https://docs.google.com/forms/d/e/1FAIpQLSdqabIpnGKutRdKbWfeZ1ZLa0vtjX_ImtdM4QVyXghSfPEaVw/viewform",
  en: "https://docs.google.com/forms/d/e/1FAIpQLSeZOC2zasWjExptQrjdahJwMShjPMYbrzenFSPs3m3CH-wexQ/viewform",
};

export function surveyUrl(locale: Locale): string {
  return SURVEY_URLS[locale];
}
