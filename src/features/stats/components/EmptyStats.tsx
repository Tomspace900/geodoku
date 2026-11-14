import { useLocale } from "@/i18n/LocaleContext";

/** Aucune partie finie : une mini-grille vide et une phrase. */
export function EmptyStats() {
  const { t } = useLocale();
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl bg-surface-low px-6 py-10 text-center">
      <span aria-hidden className="grid grid-cols-3 gap-1">
        {Array.from({ length: 9 }, (_, index) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: neuf cases fixes
            key={index}
            className="size-5 rounded-[4px] bg-surface-highest"
          />
        ))}
      </span>
      <p className="font-serif text-xl font-medium text-on-surface">
        {t("stats.empty")}
      </p>
    </div>
  );
}
