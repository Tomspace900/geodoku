import type { Locale } from "@/i18n/types";

/**
 * Pilotage du lien vers le sondage joueurs (Google Forms).
 *
 * L'affichage est gouverné par le feature flag PostHog `SURVEY_FLAG` : on
 * l'allume/éteint en un clic dans le dashboard PostHog, sans redéploiement.
 * Les URLs vivent ici pour n'avoir qu'un seul endroit à toucher.
 */
export const SURVEY_FLAG = "survey_active";

/** Clé localStorage : posée au 1er clic OU à la fermeture du CTA sondage, le masque ensuite partout. */
export const SURVEY_DONE_KEY = "geodoku:surveyDone";

const SURVEY_URLS: Record<Locale, string> = {
  fr: "https://docs.google.com/forms/d/e/1FAIpQLSdqabIpnGKutRdKbWfeZ1ZLa0vtjX_ImtdM4QVyXghSfPEaVw/viewform",
  en: "https://docs.google.com/forms/d/e/1FAIpQLSeZOC2zasWjExptQrjdahJwMShjPMYbrzenFSPs3m3CH-wexQ/viewform",
};

export function surveyUrl(locale: Locale): string {
  return SURVEY_URLS[locale];
}
