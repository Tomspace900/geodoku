import { useT } from "@/i18n/LocaleContext";
import type { TKey } from "@/i18n/types";
import { LegalBullet } from "./components/LegalBullet";
import { LegalContactSection } from "./components/LegalContactSection";
import { LegalLayout } from "./components/LegalLayout";
import { LegalParagraph } from "./components/LegalParagraph";
import { LegalSection } from "./components/LegalSection";
import { LegalSupportSection } from "./components/LegalSupportSection";

// Étapes marquantes côté joueur, de la plus récente à la plus ancienne.
const ENTRIES: { date: TKey; title: TKey; body: TKey }[] = [
  {
    date: "changelog.entries.countryDataRefreshDate",
    title: "changelog.entries.countryDataRefreshTitle",
    body: "changelog.entries.countryDataRefreshBody",
  },
  {
    date: "changelog.entries.constraintsRefreshDate",
    title: "changelog.entries.constraintsRefreshTitle",
    body: "changelog.entries.constraintsRefreshBody",
  },
  {
    date: "changelog.entries.scoringV2Date",
    title: "changelog.entries.scoringV2Title",
    body: "changelog.entries.scoringV2Body",
  },
  {
    date: "changelog.entries.reliabilityDate",
    title: "changelog.entries.reliabilityTitle",
    body: "changelog.entries.reliabilityBody",
  },
  {
    date: "changelog.entries.darkModeDate",
    title: "changelog.entries.darkModeTitle",
    body: "changelog.entries.darkModeBody",
  },
  {
    date: "changelog.entries.identityDate",
    title: "changelog.entries.identityTitle",
    body: "changelog.entries.identityBody",
  },
  {
    date: "changelog.entries.comfortDate",
    title: "changelog.entries.comfortTitle",
    body: "changelog.entries.comfortBody",
  },
  {
    date: "changelog.entries.helpDate",
    title: "changelog.entries.helpTitle",
    body: "changelog.entries.helpBody",
  },
  {
    date: "changelog.entries.footerDate",
    title: "changelog.entries.footerTitle",
    body: "changelog.entries.footerBody",
  },
  {
    date: "changelog.entries.scoringDate",
    title: "changelog.entries.scoringTitle",
    body: "changelog.entries.scoringBody",
  },
  {
    date: "changelog.entries.solutionDate",
    title: "changelog.entries.solutionTitle",
    body: "changelog.entries.solutionBody",
  },
  {
    date: "changelog.entries.bilingualDate",
    title: "changelog.entries.bilingualTitle",
    body: "changelog.entries.bilingualBody",
  },
  {
    date: "changelog.entries.launchDate",
    title: "changelog.entries.launchTitle",
    body: "changelog.entries.launchBody",
  },
];

const ROADMAP: TKey[] = [
  "changelog.roadmapReplay",
  "changelog.roadmapConstraints",
  "changelog.roadmapLives",
];

export function ChangelogPage() {
  const t = useT();

  return (
    <LegalLayout
      title={t("changelog.title")}
      eyebrow={t("changelog.eyebrow")}
      backLabel={t("changelog.backToGame")}
      analyticsPage="changelog"
    >
      <div className="flex flex-col gap-6">
        {ENTRIES.map((entry) => (
          <article key={entry.date} className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className="size-1.5 shrink-0 rounded-full bg-brand"
              />
              <h2 className="font-serif text-base font-medium text-on-surface">
                {t(entry.date)}
              </h2>
            </div>
            <p className="pl-4 font-sans text-sm leading-relaxed text-on-surface-variant">
              <span className="font-medium text-on-surface">
                {t(entry.title)}.
              </span>{" "}
              {t(entry.body)}
            </p>
          </article>
        ))}
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

        <LegalSupportSection />
      </div>
    </LegalLayout>
  );
}
