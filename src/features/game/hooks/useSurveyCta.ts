import { useLocale } from "@/i18n/LocaleContext";
import { safeGet, safeSet } from "@/lib/storage";
import { SURVEY_DONE_KEY, SURVEY_FLAG, surveyUrl } from "@/lib/survey";
import { useFeatureFlagEnabled, usePostHog } from "@posthog/react";
import { useState } from "react";

export type SurveySource = "result_screen" | "solution_screen";

/**
 * État du CTA sondage : visibilité (feature flag PostHog `survey_active` +
 * masquage définitif après la 1re interaction — clic OU fermeture), URL
 * localisée et handlers qui tracent l'event puis mémorisent l'interaction.
 */
export function useSurveyCta(source: SurveySource) {
  const { locale } = useLocale();
  const posthog = usePostHog();
  const active = useFeatureFlagEnabled(SURVEY_FLAG);
  const [done, setDone] = useState(() => safeGet(SURVEY_DONE_KEY) === "1");

  function markDone() {
    safeSet(SURVEY_DONE_KEY, "1");
    setDone(true);
  }

  function onClick() {
    markDone();
    posthog?.capture("survey_link_clicked", { source, locale });
  }

  function onDismiss() {
    markDone();
    posthog?.capture("survey_dismissed", { source, locale });
  }

  return {
    visible: active === true && !done,
    href: surveyUrl(locale),
    onClick,
    onDismiss,
  };
}
