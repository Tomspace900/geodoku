import { useLocale } from "@/i18n/LocaleContext";
import { todayUTC } from "@/lib/dates";
import { safeGet, safeSet } from "@/lib/storage";
import {
  SURVEY_DONE_KEY,
  SURVEY_FLAG,
  isSurveyDone,
  serializeSurveyDone,
  surveyUrl,
} from "@/lib/survey";
import { useFeatureFlagEnabled, usePostHog } from "@posthog/react";
import { useState } from "react";

export type SurveySource = "result_screen" | "solution_screen" | "footer";

/**
 * État du CTA sondage : visibilité (feature flag PostHog `survey_active` +
 * masquage via `geodoku:survey-done`), URL localisée et handlers qui tracent
 * l'event puis mémorisent l'interaction. Un clic masque définitivement ; une
 * fermeture ne masque que pour le jour courant (cf. `isSurveyDone`).
 */
export function useSurveyCta(source: SurveySource) {
  const { locale } = useLocale();
  const posthog = usePostHog();
  const active = useFeatureFlagEnabled(SURVEY_FLAG);
  const [done, setDone] = useState(() =>
    isSurveyDone(safeGet(SURVEY_DONE_KEY), todayUTC()),
  );

  function onClick() {
    safeSet(SURVEY_DONE_KEY, serializeSurveyDone({ kind: "clicked" }));
    setDone(true);
    posthog?.capture("survey_link_clicked", { source, locale });
  }

  function onDismiss() {
    safeSet(
      SURVEY_DONE_KEY,
      serializeSurveyDone({ kind: "dismissed", date: todayUTC() }),
    );
    setDone(true);
    posthog?.capture("survey_dismissed", { source, locale });
  }

  return {
    visible: active === true && !done,
    href: surveyUrl(locale),
    onClick,
    onDismiss,
  };
}
