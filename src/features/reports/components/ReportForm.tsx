import { Check, CircleAlert, Flag, LoaderCircle, WifiOff } from "lucide-react";
import { type FormEvent, useId, useRef, useState } from "react";
import { Eyebrow } from "@/components/editorial/Eyebrow";
import { Notice } from "@/components/Notice";
import { Button } from "@/components/ui/button";
import { createBrowserUuidV4 } from "@/features/game/logic/browserUuid";
import { useLocale } from "@/i18n/LocaleContext";
import type { TKey } from "@/i18n/types";
import { cn } from "@/lib/utils";
import {
  cleanReportMessage,
  REPORT_MESSAGE_MAX,
  type ReportCategory,
} from "../logic/report";
import type { ReportSendOutcome } from "../logic/submitOutcome";

const CATEGORIES: ReadonlyArray<{ id: ReportCategory; labelKey: TKey }> = [
  { id: "content", labelKey: "report.categoryContent" },
  { id: "bug", labelKey: "report.categoryBug" },
];

const PLACEHOLDER_KEY: Record<ReportCategory, TKey> = {
  content: "report.placeholderContent",
  bug: "report.placeholderBug",
};

type Props = {
  initialCategory: ReportCategory;
  /**
   * Vrai quand la case ou la contrainte part avec le signalement (tiroir de
   * la grille solution). Sans elle, l'onglet « Réponse ou contrainte »
   * rappelle qu'on peut signaler depuis la grille des réponses.
   */
  hasGridTarget: boolean;
  onSubmit: (
    reportId: string,
    category: ReportCategory,
    message: string,
  ) => Promise<ReportSendOutcome>;
  /** Après « Merci » : fermer le tiroir. */
  onDone: () => void;
};

/**
 * Le signalement lui-même (#127) : la nature, présélectionnée par l'entrée,
 * puis le texte. Rien d'autre à remplir : la case, la contrainte ou la page
 * partent avec. Au trait des tiroirs du compte : messages en encart
 * (`Notice`), bouton pleine largeur. Un échec se dit sur place et le texte
 * reste dans le champ.
 */
export function ReportForm({
  initialCategory,
  hasGridTarget,
  onSubmit,
  onDone,
}: Props) {
  const { t } = useLocale();
  const fieldId = useId();
  const hintId = useId();
  const [category, setCategory] = useState(initialCategory);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [outcome, setOutcome] = useState<ReportSendOutcome | null>(null);
  // Un identifiant par ouverture du formulaire, tiré au premier envoi et
  // gardé pour les nouveaux essais : un renvoi n'écrit jamais deux fois.
  const reportIdRef = useRef<string | null>(null);
  const length = cleanReportMessage(message).length;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (length === 0 || sending) return;
    setSending(true);
    setOutcome(null);
    try {
      reportIdRef.current ??= createBrowserUuidV4();
      setOutcome(await onSubmit(reportIdRef.current, category, message));
    } finally {
      setSending(false);
    }
  }

  if (outcome === "sent") {
    return (
      <div className="flex flex-col gap-6 pt-2">
        <Notice tone="success" icon={<Check />}>
          <p className="font-medium">{t("report.sentTitle")}</p>
          <p>{t("report.sentBody")}</p>
        </Notice>
        <Button
          type="button"
          variant="secondary"
          className="h-11 w-full"
          onClick={onDone}
        >
          {t("report.close")}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6 pt-2">
      <fieldset className="m-0 grid min-w-0 grid-cols-2 gap-1 rounded-xl border-0 bg-surface-low p-1">
        <legend className="sr-only">{t("report.categoryLabel")}</legend>
        {CATEGORIES.map(({ id, labelKey }) => (
          <Button
            key={id}
            type="button"
            variant="ghost"
            size="sm"
            aria-pressed={category === id}
            onClick={() => setCategory(id)}
            className={cn(
              "h-10 whitespace-normal rounded-lg px-2 text-sm",
              category === id &&
                "bg-surface-lowest text-on-surface shadow-editorial",
            )}
          >
            {t(labelKey)}
          </Button>
        ))}
      </fieldset>

      {category === "content" && !hasGridTarget && (
        <Notice tone="neutral" icon={<Flag />}>
          {t("report.gridHint")}
        </Notice>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor={fieldId}>
          <Eyebrow as="span">{t("report.messageLabel")}</Eyebrow>
        </label>
        <textarea
          id={fieldId}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          maxLength={REPORT_MESSAGE_MAX}
          rows={4}
          aria-describedby={hintId}
          placeholder={t(PLACEHOLDER_KEY[category])}
          className="mt-1 w-full resize-none rounded-xl bg-surface-low px-3.5 py-3 text-base text-on-surface placeholder:text-on-surface-variant focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-surface/20"
        />
        <div className="flex items-start justify-between gap-3 pt-1 text-xs text-on-surface-variant">
          <p id={hintId}>{t("report.privacyHint")}</p>
          <span className="shrink-0 tabular-nums" aria-hidden>
            {t("report.counter", { count: length, max: REPORT_MESSAGE_MAX })}
          </span>
        </div>
      </div>

      {outcome === "failed" && (
        <Notice icon={<WifiOff />}>{t("report.failed")}</Notice>
      )}
      {outcome === "rate_limited" && (
        <Notice icon={<CircleAlert />}>{t("report.rateLimited")}</Notice>
      )}

      <Button
        type="submit"
        className="h-11 w-full gap-2"
        disabled={length === 0 || sending}
      >
        {sending && (
          <LoaderCircle className="size-4 animate-spin" aria-hidden />
        )}
        {t("report.submit")}
      </Button>
    </form>
  );
}
