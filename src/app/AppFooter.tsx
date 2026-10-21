import { useFeatureFlagEnabled, usePostHog } from "@posthog/react";
import { Coffee, MessageSquareText } from "lucide-react";
import { Link } from "react-router";
import { KOFI_URL } from "@/app/links";
import { isChangelogNewBadgeVisible } from "@/features/legal/logic/changelog";
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

function Middot() {
  return (
    <span className="select-none text-outline-variant/40" aria-hidden="true">
      ·
    </span>
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

  const linkClass =
    "underline underline-offset-2 decoration-outline-variant/40 transition-colors hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-surface/20 focus-visible:ring-offset-2 focus-visible:ring-offset-surface rounded-sm";
  const showChangelogNewBadge = isChangelogNewBadgeVisible();

  return (
    <footer
      className={cn(
        "flex justify-center px-2 pt-6 sm:pt-8 md:pt-10",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-2.5 text-center sm:gap-3 md:gap-4">
        {/* Mot doux et soutien sur une ligne ; les pages sur la suivante. Le
            contact et le crédit à Metrodoku vivent dans « À propos ». */}
        <div className="flex max-w-md flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 px-1 font-sans text-[10px] leading-snug text-on-surface-variant sm:px-2 sm:text-xs sm:leading-relaxed">
          <p>{t("footer.loveCredit")}</p>
          <Middot />
          <a
            href={KOFI_URL}
            className={cn(
              "inline-flex items-center gap-1 text-on-surface-variant",
              linkClass,
            )}
            rel="noopener noreferrer"
            target="_blank"
            onClick={() => trackFooterLink("support")}
          >
            <Coffee className="size-3 sm:size-3.5" aria-hidden="true" />
            {t("footer.support")}
          </a>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 font-sans text-[10px] text-on-surface-variant sm:gap-x-2 sm:gap-y-1 sm:text-xs">
          <Link
            to={localizedPath("/about")}
            className={linkClass}
            onClick={() => trackFooterLink("about")}
          >
            {t("footer.about")}
          </Link>
          <Middot />
          <span className="inline-flex items-center gap-1">
            {showChangelogNewBadge ? (
              <span className="rounded-full bg-brand/10 px-1 font-sans text-[8px] font-semibold uppercase tracking-wider text-brand no-underline">
                {t("footer.changelogNew")}
              </span>
            ) : null}
            <Link
              to={localizedPath("/changelog")}
              className={linkClass}
              onClick={() => trackFooterLink("changelog")}
            >
              {t("footer.changelog")}
            </Link>
          </span>
          <Middot />
          <Link
            to={localizedPath("/privacy")}
            className={linkClass}
            onClick={() => trackFooterLink("privacy")}
          >
            {t("footer.privacy")}
          </Link>
          {surveyActive === true ? (
            <>
              <Middot />
              <a
                href={surveyUrl(locale)}
                target="_blank"
                rel="noopener noreferrer"
                className={cn("inline-flex items-center gap-1", linkClass)}
                onClick={trackSurveyLink}
              >
                <MessageSquareText
                  className="size-3 sm:size-3.5"
                  aria-hidden="true"
                />
                {t("footer.survey")}
              </a>
            </>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 font-sans text-[10px] text-on-surface-variant sm:gap-x-2 sm:gap-y-1 sm:text-xs">
          <span>{t("footer.copyright", { year })}</span>
          <Middot />
          <LocaleSwitcher />
        </div>
      </div>
    </footer>
  );
}
