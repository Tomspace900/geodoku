import { useT } from "@/i18n/LocaleContext";
import type { TKey } from "@/i18n/types";
import { LegalParagraph } from "./LegalParagraph";
import { LegalSection } from "./LegalSection";
import { SUPPORT_EMAIL, inlineLinkClass } from "./constants";

type Props = {
  title: TKey;
  bodyPre: TKey;
};

/** Section « contact » avec lien mailto, partagée entre pages légales. */
export function LegalContactSection({ title, bodyPre }: Props) {
  const t = useT();
  return (
    <LegalSection title={t(title)}>
      <LegalParagraph>
        {t(bodyPre)}{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`} className={inlineLinkClass}>
          {SUPPORT_EMAIL}
        </a>
        .
      </LegalParagraph>
    </LegalSection>
  );
}
