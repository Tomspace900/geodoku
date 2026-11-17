import { usePostHog } from "@posthog/react";
import { useMutation } from "convex/react";
import { getOrCreateClientId } from "@/features/game/logic/clientId";
import type { GameModeId } from "@/features/game/types";
import { useLocale } from "@/i18n/LocaleContext";
import { api } from "../../../../convex/_generated/api";
import type { ReportCategory, ReportTarget } from "../logic/report";
import {
  type ReportSendOutcome,
  type ReportSubmitEventOutcome,
  SUBMIT_TIMEOUT_MS,
  toSendOutcome,
  withTimeout,
} from "../logic/submitOutcome";

/** D'où part le signalement, pour les events. */
export type ReportSource = "solution_cell" | "solution_constraint" | "footer";

/**
 * Envoie un signalement (#127) et dit au formulaire comment ça s'est passé.
 * Le `clientId` n'est lu qu'au moment de l'envoi (clé de la limite de
 * débit, jamais stockée avec le signalement). Les events portent la nature
 * et l'issue, jamais le texte.
 */
export function useReportSubmit({
  source,
  mode,
  target,
}: {
  source: ReportSource;
  mode?: GameModeId;
  target: ReportTarget;
}) {
  const posthog = usePostHog();
  const { locale } = useLocale();
  const submitReport = useMutation(api.reports.submit);

  function trackOpened(): void {
    posthog?.capture("report_dialog_opened", { source, mode });
  }

  async function submit(
    reportId: string,
    category: ReportCategory,
    message: string,
  ): Promise<ReportSendOutcome> {
    let result: ReportSubmitEventOutcome;
    try {
      const answer = await withTimeout(
        submitReport({
          reportId,
          clientId: getOrCreateClientId(),
          category,
          target,
          message,
          locale,
        }),
        SUBMIT_TIMEOUT_MS,
      );
      result = answer === "timeout" ? "failed" : answer;
    } catch {
      result = "failed";
    }
    posthog?.capture("report_submitted", {
      source,
      mode,
      category,
      outcome: result,
    });
    return toSendOutcome(result);
  }

  return { submit, trackOpened };
}
