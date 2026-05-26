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
          variant="ghost-label"
          onClick={() => setLocale(l)}
          className={cn(
            "px-1 text-[9px] tracking-wider sm:px-1.5 sm:text-[10px] sm:tracking-widest md:px-2 md:py-0.5",
            locale === l && "text-on-surface",
          )}
        >
          {l.toUpperCase()}
        </Button>
      ))}
    </div>
  );
}
