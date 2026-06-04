import { useT } from "@/i18n/LocaleContext";
import { LegalContactSection } from "./components/LegalContactSection";
import { LegalLayout } from "./components/LegalLayout";
import { LegalParagraph } from "./components/LegalParagraph";
import { LegalSection } from "./components/LegalSection";

export function PrivacyPage() {
  const t = useT();

  return (
    <LegalLayout
      title={t("privacy.title")}
      eyebrow={t("privacy.eyebrow")}
      backLabel={t("privacy.backToGame")}
      lead={t("privacy.lead")}
    >
      <div className="flex flex-col gap-7">
        <LegalSection title={t("privacy.essenceTitle")}>
          <LegalParagraph>{t("privacy.essenceBody")}</LegalParagraph>
        </LegalSection>

        <LegalSection title={t("privacy.deviceTitle")}>
          <LegalParagraph>{t("privacy.deviceBody")}</LegalParagraph>
        </LegalSection>

        <LegalSection title={t("privacy.serverTitle")}>
          <LegalParagraph>{t("privacy.serverBody")}</LegalParagraph>
        </LegalSection>

        <LegalSection title={t("privacy.thirdPartyTitle")}>
          <LegalParagraph>{t("privacy.thirdPartyBody")}</LegalParagraph>
        </LegalSection>

        <LegalSection title={t("privacy.rightsTitle")}>
          <LegalParagraph>{t("privacy.rightsBody")}</LegalParagraph>
        </LegalSection>

        <LegalContactSection
          title="privacy.contactTitle"
          bodyPre="privacy.contactBodyPre"
        />
      </div>
    </LegalLayout>
  );
}
