import type { ReactNode } from "react";

/** Puce éditoriale : pastille brand alignée sur la première ligne du contenu. */
export function LegalBullet({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-2.5 font-sans text-sm leading-relaxed text-on-surface-variant">
      <span
        aria-hidden="true"
        className="mt-[0.5rem] size-1.5 shrink-0 rounded-full bg-brand"
      />
      <span>{children}</span>
    </li>
  );
}
