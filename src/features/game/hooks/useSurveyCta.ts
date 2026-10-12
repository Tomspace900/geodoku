import { useFeatureFlagEnabled, usePostHog } from "@posthog/react";
import { useSyncExternalStore } from "react";
import { useLocale } from "@/i18n/LocaleContext";
import { todayUTC } from "@/lib/dates";
import {
  getSurveyDoneSnapshot,
  isSurveyDone,
  markSurveyClicked,
  markSurveyDismissed,
  SURVEY_FLAG,
  SURVEY_ID,
  subscribeSurveyDone,
  surveyUrl,
} from "@/lib/survey";

export type SurveySource = "result_screen" | "solution_screen" | "footer";

/**
 * État du CTA sondage : visibilité (feature flag PostHog `survey_active` +
 * masquage via `geodoku:survey-done`), URL localisée et handlers qui tracent
 * l'event puis mémorisent l'interaction. Un clic masque définitivement ; une
 * fermeture ne masque que pour le jour courant, dans la limite de
 * `MAX_SURVEY_DISMISSALS` (cf. `isSurveyDone`).
 */
export function useSurveyCta(source: SurveySource) {
  const { locale } = useLocale();
  const posthog = usePostHog();
  const active = useFeatureFlagEnabled(SURVEY_FLAG);
  const rawDone = useSyncExternalStore(
    subscribeSurveyDone,
    getSurveyDoneSnapshot,
    () => null,
  );
  const done = isSurveyDone(rawDone, todayUTC());

  function onClick() {
    markSurveyClicked();
    posthog?.capture("survey_link_clicked", {
      source,
      locale,
      survey_id: SURVEY_ID,
    });
  }

  function onDismiss() {
    markSurveyDismissed(todayUTC());
    posthog?.capture("survey_dismissed", {
      source,
      locale,
      survey_id: SURVEY_ID,
    });
  }

  return {
    visible: active === true && !done,
    href: surveyUrl(locale),
    onClick,
    onDismiss,
  };
}
