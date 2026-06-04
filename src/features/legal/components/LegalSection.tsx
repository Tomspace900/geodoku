import type { ReactNode } from "react";

/** Section éditoriale : titre serif + contenu libre, sans bordure. */
export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-serif text-xl font-medium text-on-surface">
        {title}
      </h2>
      {children}
    </section>
  );
}
