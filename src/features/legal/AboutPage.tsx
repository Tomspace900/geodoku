import { METRODOKU_URL } from "@/app/links";
import { HOW_TO_PLAY_RULES } from "@/features/game/components/HowToPlayLink";
import { IconRuleList } from "@/features/game/components/IconRuleList";
import { SCORE_PARTS_BY_SCALE } from "@/features/game/components/ScoreInfoDialog";
import { useT } from "@/i18n/LocaleContext";
import type { TKey } from "@/i18n/types";
import { inlineLinkClass } from "./components/constants";
import { LegalBullet } from "./components/LegalBullet";
import { LegalContactSection } from "./components/LegalContactSection";
import { LegalLayout } from "./components/LegalLayout";
import { LegalParagraph } from "./components/LegalParagraph";
import { LegalSection } from "./components/LegalSection";

const FAQ: readonly { questionKey: TKey; answerKey: TKey }[] = [
  { questionKey: "aboutPage.faqPriceQ", answerKey: "aboutPage.faqPriceA" },
  {
    questionKey: "aboutPage.faqNewGridQ",
    answerKey: "aboutPage.faqNewGridA",
  },
  {
    questionKey: "aboutPage.faqBlockedQ",
    answerKey: "aboutPage.faqBlockedA",
  },
  { questionKey: "aboutPage.faqAppQ", answerKey: "aboutPage.faqAppA" },
  {
    questionKey: "aboutPage.faqSourcesQ",
    answerKey: "aboutPage.faqSourcesA",
  },
];

/**
 * Page « À propos » (#142), pré-rendue en français et en anglais : le texte
 * que Google et les moteurs IA peuvent lire et citer, l'écran de jeu restant
 * inchangé. Les règles et le barème reprennent mot pour mot la modale et le
 * calcul du score (`IconRuleList`). La FAQ ne dit que des faits vérifiés dans
 * le code : un fait qui change doit changer ici aussi. Le contact et le
 * crédit à Metrodoku y vivent, plutôt que dans le pied de page.
 */
export function AboutPage() {
  const t = useT();

  return (
    <LegalLayout
      title={t("aboutPage.title")}
      eyebrow={t("aboutPage.eyebrow")}
      backLabel={t("aboutPage.backToGame")}
      lead={
        <>
          {t("aboutPage.leadPre")}
          <a
            href={METRODOKU_URL}
            className={inlineLinkClass}
            rel="noopener noreferrer"
            target="_blank"
          >
            Metrodoku
          </a>
          {t("aboutPage.leadPost")}
        </>
      }
      analyticsPage="about"
    >
      <div className="flex flex-col gap-7">
        <LegalSection title={t("aboutPage.rulesTitle")}>
          <IconRuleList rules={HOW_TO_PLAY_RULES} />
        </LegalSection>

        <LegalSection title={t("aboutPage.scoreTitle")}>
          <div className="flex flex-col gap-4">
            <LegalParagraph>
              {t("scoring.intro", { max: t("scoring.introMax") })}
            </LegalParagraph>
            <IconRuleList rules={SCORE_PARTS_BY_SCALE.daily} />
          </div>
        </LegalSection>

        <LegalSection title={t("aboutPage.trainingTitle")}>
          <LegalParagraph>{t("aboutPage.trainingBody")}</LegalParagraph>
        </LegalSection>

        <LegalSection title={t("aboutPage.faqTitle")}>
          <ul className="flex flex-col gap-3">
            {FAQ.map(({ questionKey, answerKey }) => (
              <LegalBullet key={questionKey}>
                <span className="block font-semibold text-on-surface">
                  {t(questionKey)}
                </span>
                {t(answerKey)}
              </LegalBullet>
            ))}
          </ul>
        </LegalSection>

        <LegalContactSection
          title="aboutPage.contactTitle"
          bodyPre="aboutPage.contactBodyPre"
        />
      </div>
    </LegalLayout>
  );
}
