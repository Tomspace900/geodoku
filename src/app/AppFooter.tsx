import { useFeatureFlagEnabled, usePostHog } from "@posthog/react";
import { Coffee, Flag, Globe, MessageSquareText } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { KOFI_URL } from "@/app/links";
import { isChangelogNewBadgeVisible } from "@/features/legal/logic/changelog";
import { GeneralReportEntry } from "@/features/reports/components/GeneralReportEntry";
import { LocaleSwitcher } from "@/i18n/components/LocaleSwitcher";
import { useLocale, useT } from "@/i18n/LocaleContext";
import {
  markSurveyClicked,
  SURVEY_FLAG,
  SURVEY_ID,
  surveyUrl,
} from "@/lib/survey";
import { cn } from "@/lib/utils";

type FooterLink = "support" | "about" | "privacy" | "changelog";

const LINK_CLASS =
  "underline underline-offset-2 decoration-outline-variant/40 transition-colors hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-surface/20 focus-visible:ring-offset-2 focus-visible:ring-offset-surface rounded-sm";

function Middot() {
  return (
    <span className="select-none text-outline-variant/40" aria-hidden="true">
      ·
    </span>
  );
}

/** Une ligne du pied de page : ses éléments séparés par des points médians. */
function Row({ items }: { items: ReactNode[] }) {
  return (
    <div className="flex max-w-md flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 px-1 font-sans text-[10px] leading-snug text-on-surface-variant sm:gap-x-2 sm:gap-y-1 sm:px-2 sm:text-xs sm:leading-relaxed">
      {items.flatMap((item, index) =>
        index === 0
          ? [item]
          : [
              // biome-ignore lint/suspicious/noArrayIndexKey: ordre fixe
              <Middot key={`dot-${index}`} />,
              item,
            ],
      )}
    </div>
  );
}

export default function AppFooter({ className }: { className?: string }) {
  const posthog = usePostHog();
  const t = useT();
  const { locale, localizedPath } = useLocale();
  const year = new Date().getFullYear();
  const surveyActive = useFeatureFlagEnabled(SURVEY_FLAG);

  function trackFooterLink(link: FooterLink) {
    posthog?.capture("footer_link_clicked", { link });
  }

  function trackSurveyLink() {
    // Un clic vaut réponse/décision prise : masque le CTA banderole partout,
    // comme un clic depuis la banderole elle-même (cf. useSurveyCta).
    markSurveyClicked();
    posthog?.capture("survey_link_clicked", {
      source: "footer",
      locale,
      survey_id: SURVEY_ID,
    });
  }

  const showChangelogNewBadge = isChangelogNewBadgeVisible();

  const credit = <p key="credit">{t("footer.loveCredit")}</p>;
  const support = (
    <a
      key="support"
      href={KOFI_URL}
      className={cn("inline-flex items-center gap-1", LINK_CLASS)}
      rel="noopener noreferrer"
      target="_blank"
      onClick={() => trackFooterLink("support")}
    >
      <Coffee className="size-3 sm:size-3.5" aria-hidden="true" />
      {t("footer.support")}
    </a>
  );
  const about = (
    <Link
      key="about"
      to={localizedPath("/about")}
      className={LINK_CLASS}
      onClick={() => trackFooterLink("about")}
    >
      {t("footer.about")}
    </Link>
  );
  const changelog = (
    <span key="changelog" className="inline-flex items-center gap-1">
      {showChangelogNewBadge ? (
        <span className="rounded-full bg-brand/10 px-1 font-sans text-[8px] font-semibold uppercase tracking-wider text-brand no-underline">
          {t("footer.changelogNew")}
        </span>
      ) : null}
      <Link
        to={localizedPath("/changelog")}
        className={LINK_CLASS}
        onClick={() => trackFooterLink("changelog")}
      >
        {t("footer.changelog")}
      </Link>
    </span>
  );
  const privacy = (
    <Link
      key="privacy"
      to={localizedPath("/privacy")}
      className={LINK_CLASS}
      onClick={() => trackFooterLink("privacy")}
    >
      {t("footer.privacy")}
    </Link>
  );
  const survey =
    surveyActive === true ? (
      <a
        key="survey"
        href={surveyUrl(locale)}
        target="_blank"
        rel="noopener noreferrer"
        className={cn("inline-flex items-center gap-1", LINK_CLASS)}
        onClick={trackSurveyLink}
      >
        <MessageSquareText className="size-3 sm:size-3.5" aria-hidden="true" />
        {t("footer.survey")}
      </a>
    ) : null;
  const pages = [about, changelog, privacy, ...(survey ? [survey] : [])];
  const report = (
    <GeneralReportEntry
      key="report"
      source="footer"
      className={cn(
        "inline-flex gap-1 text-[10px] text-on-surface-variant sm:text-xs [&_svg]:size-3 sm:[&_svg]:size-3.5",
        LINK_CLASS,
      )}
    >
      <Flag aria-hidden="true" />
      {t("report.entryShort")}
    </GeneralReportEntry>
  );
  const language = (
    <span key="language" className="inline-flex items-center">
      <Globe
        className="mr-0.5 size-3 text-on-surface-variant sm:size-3.5"
        aria-hidden="true"
      />
      <LocaleSwitcher />
    </span>
  );
  const copyright = (
    <span key="copyright">{t("footer.copyright", { year })}</span>
  );

  // Le mot doux et le café d'abord, les pages, puis la ligne utilitaire :
  // © , « ⚑ Signaler » (#127) et la langue (tranché sur maquettes).
  const rows: ReactNode[][] = [
    [credit, support],
    pages,
    [copyright, report, language],
  ];

  return (
    <footer
      className={cn(
        "flex justify-center px-2 pt-6 sm:pt-8 md:pt-10",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-2.5 text-center sm:gap-3 md:gap-4">
        {rows.map((items, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: ordre fixe
          <Row key={index} items={items} />
        ))}
      </div>
    </footer>
  );
}
