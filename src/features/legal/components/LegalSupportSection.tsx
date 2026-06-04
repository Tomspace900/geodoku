import { useT } from "@/i18n/LocaleContext";
import { LegalParagraph } from "./LegalParagraph";
import { LegalSection } from "./LegalSection";
import { KOFI_URL, inlineLinkClass } from "./constants";

/** Section « soutenir le projet » (Ko-fi), identique sur toutes les pages légales. */
export function LegalSupportSection() {
  const t = useT();
  return (
    <LegalSection title={t("legal.supportTitle")}>
      <LegalParagraph>
        {t("legal.supportPre")}{" "}
        <a
          href={KOFI_URL}
          className={inlineLinkClass}
          rel="noopener noreferrer"
          target="_blank"
        >
          {t("legal.supportLink")}
        </a>
        {t("legal.supportPost")}
      </LegalParagraph>
    </LegalSection>
  );
}
