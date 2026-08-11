import { MessageSquareText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  type SurveySource,
  useSurveyCta,
} from "@/features/game/hooks/useSurveyCta";
import { useT } from "@/i18n/LocaleContext";

type Props = {
  source: SurveySource;
};

/**
 * Banderole sondage post-partie : sobre, dismissible, affichée une seule fois
 * (feature flag `survey_active` + masquage après clic ou fermeture, via
 * `useSurveyCta`). À placer uniquement dans un état de partie terminée.
 */
export function SurveyCta({ source }: Props) {
  const t = useT();
  const survey = useSurveyCta(source);

  if (!survey.visible) return null;

  return (
    <div className="flex items-center gap-2 rounded-xl bg-brand/10 py-2 pl-4 pr-2">
      <a
        href={survey.href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={survey.onClick}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-sm py-1 text-brand transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
      >
        <MessageSquareText className="size-5 shrink-0" aria-hidden="true" />
        <span className="min-w-0 text-sm font-medium">
          {t("ui.surveyPrompt")}
        </span>
      </a>
      <Button
        type="button"
        variant="ghost"
        size="auto"
        onClick={survey.onDismiss}
        aria-label={t("ui.closeResult")}
        className="shrink-0 p-1.5 text-brand/60 hover:bg-brand/15 hover:text-brand"
      >
        <X size={16} />
      </Button>
    </div>
  );
}
