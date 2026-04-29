import { Button } from "@/components/ui/button";
import { useLocale } from "@/i18n/LocaleContext";
import type { Locale } from "@/i18n/types";
import { cn } from "@/lib/utils";

const LOCALES: Locale[] = ["fr", "en"];

export function LocaleSwitcher({ className }: { className?: string }) {
  const { locale, setLocale } = useLocale();

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-1 sm:gap-2",
        className,
      )}
    >
      {LOCALES.map((l) => (
        <Button
          key={l}
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setLocale(l)}
          className={cn(
            "h-auto px-1 py-0 text-[9px] font-semibold uppercase tracking-wider sm:px-1.5 sm:text-[10px] sm:tracking-widest md:px-2 md:py-0.5",
            locale === l
              ? "text-on-surface"
              : "text-on-surface-variant hover:text-on-surface",
          )}
        >
          {l.toUpperCase()}
        </Button>
      ))}
    </div>
  );
}
