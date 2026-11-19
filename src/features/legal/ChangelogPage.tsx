import { Eyebrow } from "@/components/editorial/Eyebrow";
import { useLocale, useT } from "@/i18n/LocaleContext";
import type { TKey } from "@/i18n/types";
import { APP_VERSION } from "@/lib/appVersion";
import { cn } from "@/lib/utils";
import { LegalBullet } from "./components/LegalBullet";
import { LegalContactSection } from "./components/LegalContactSection";
import { LegalLayout } from "./components/LegalLayout";
import { LegalParagraph } from "./components/LegalParagraph";
import { LegalSection } from "./components/LegalSection";
import {
  CHANGELOG_ENTRIES,
  formatChangelogDate,
  formatChangelogMonth,
  LATEST_CHANGELOG_UPDATE_DATE,
} from "./logic/changelog";

const ROADMAP: TKey[] = [
  "changelog.roadmapLeagues",
  "changelog.roadmapCountrySheets",
  "changelog.roadmapConstraints",
  "changelog.roadmapLives",
];

/** Le titre s'enchaîne au texte par un point, sauf s'il porte déjà sa ponctuation (« D'où viennent les données ? »). */
function closeTitle(title: string): string {
  return /[.?!…]$/.test(title) ? title : `${title}.`;
}

export function ChangelogPage() {
  const t = useT();
  const { locale } = useLocale();

  return (
    <LegalLayout
      title={t("changelog.title")}
      eyebrow={t("changelog.eyebrow", {
        version: APP_VERSION,
        month: formatChangelogMonth(LATEST_CHANGELOG_UPDATE_DATE, locale),
      })}
      backLabel={t("changelog.backToGame")}
      analyticsPage="changelog"
    >
      <div className="relative flex flex-col gap-6 pl-5">
        <span
          aria-hidden="true"
          className="absolute bottom-3 left-[2.5px] top-3 w-px bg-outline-variant/25"
        />
        {CHANGELOG_ENTRIES.map((entry) => {
          const isMajor = entry.kind === "major";
          return (
            <article key={entry.id} className="relative flex flex-col gap-1.5">
              <span
                aria-hidden="true"
                className={cn(
                  "absolute rounded-full bg-brand",
                  isMajor
                    ? "-left-[21px] top-[7px] size-2 ring-4 ring-brand/15"
                    : "-left-[20px] top-[8px] size-1.5",
                )}
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <h2 className="font-serif text-base font-medium text-on-surface">
                    {formatChangelogDate(entry.dateYmd, locale)}
                  </h2>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 font-sans text-[10px] tabular-nums",
                      isMajor
                        ? "bg-brand/10 font-semibold text-brand"
                        : "bg-surface-low font-medium text-on-surface-variant",
                    )}
                  >
                    {`v${entry.version}`}
                  </span>
                </div>
                {entry.milestone ? (
                  <Eyebrow as="span" className="font-medium text-brand">
                    {t(entry.milestone)}
                  </Eyebrow>
                ) : null}
              </div>
              <p className="font-sans text-sm leading-relaxed text-on-surface-variant">
                <span className="font-medium text-on-surface">
                  {closeTitle(t(entry.title))}
                </span>{" "}
                {t(entry.body)}
              </p>
            </article>
          );
        })}
      </div>

      <div className="flex flex-col gap-7">
        <LegalSection title={t("changelog.roadmapTitle")}>
          <LegalParagraph>{t("changelog.roadmapLead")}</LegalParagraph>
          <ul className="flex flex-col gap-2">
            {ROADMAP.map((item) => (
              <LegalBullet key={item}>{t(item)}</LegalBullet>
            ))}
          </ul>
        </LegalSection>

        <LegalContactSection
          title="changelog.contactTitle"
          bodyPre="changelog.contactBodyPre"
        />
      </div>
    </LegalLayout>
  );
}
