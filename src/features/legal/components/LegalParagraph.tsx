import type { ReactNode } from "react";

/** Paragraphe de corps de texte, ton secondaire. */
export function LegalParagraph({ children }: { children: ReactNode }) {
  return (
    <p className="font-sans text-sm leading-relaxed text-on-surface-variant">
      {children}
    </p>
  );
}
