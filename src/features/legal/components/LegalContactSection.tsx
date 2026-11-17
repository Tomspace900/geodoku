import type { ReactNode } from "react";
import { SUPPORT_EMAIL } from "@/app/links";
import { useT } from "@/i18n/LocaleContext";
import type { TKey } from "@/i18n/types";
import { inlineLinkClass } from "./constants";
import { LegalParagraph } from "./LegalParagraph";
import { LegalSection } from "./LegalSection";

type Props = {
  title: TKey;
  bodyPre: TKey;
  /** Paragraphe avant l'adresse (« Un bug ? Signaler un problème », #127). */
  lead?: ReactNode;
};

/** Section « contact » avec lien mailto, partagée entre pages légales. */
export function LegalContactSection({ title, bodyPre, lead }: Props) {
  const t = useT();
  return (
    <LegalSection title={t(title)}>
      {lead && <LegalParagraph>{lead}</LegalParagraph>}
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
