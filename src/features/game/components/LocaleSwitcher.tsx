import { Button } from "@/components/ui/button";
import { useLocale } from "@/i18n/LocaleContext";
import type { Locale } from "@/i18n/types";
import { cn } from "@/lib/utils";

const LOCALES: Locale[] = ["fr", "en"];

export function LocaleSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <div className="flex items-center justify-center gap-3 mt-12">
      {LOCALES.map((l) => (
        <Button
          key={l}
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setLocale(l)}
          className={cn(
            "h-auto px-2 py-1 text-[10px] font-semibold tracking-widest uppercase",
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
