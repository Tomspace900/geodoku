import { LocaleSwitcher } from "@/features/game/components/LocaleSwitcher";
import { useT } from "@/i18n/LocaleContext";
import { cn } from "@/lib/utils";

const SUPPORT_EMAIL = "support.geodoku@gmail.com";
const METRODOKU_URL = "https://metrodoku.fr";

function Middot() {
  return (
    <span className="select-none text-outline-variant/40" aria-hidden="true">
      ·
    </span>
  );
}

export default function AppFooter({ className }: { className?: string }) {
  const t = useT();
  const year = new Date().getFullYear();

  const linkClass =
    "underline underline-offset-2 decoration-outline-variant/40 transition-colors hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-surface/20 focus-visible:ring-offset-2 focus-visible:ring-offset-surface rounded-sm";

  return (
    <footer
      className={cn(
        "flex justify-center px-2 pb-1 pt-6 sm:pb-2 sm:pt-8 md:pt-10",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-2.5 text-center sm:gap-3 md:gap-4">
        <div className="flex flex-wrap items-baseline justify-center gap-x-1.5 gap-y-0.5 sm:gap-x-2 sm:gap-y-1">
          <span className="font-serif text-base font-medium italic text-on-surface sm:text-lg md:text-xl">
            {t("ui.appName")}
          </span>
          <span className="font-sans text-[9px] font-semibold uppercase tracking-wider text-on-surface-variant sm:text-[10px] sm:tracking-widest">
            {t("footer.betaMark")}
          </span>
        </div>

        <p className="max-w-md px-1 font-sans text-[10px] leading-snug text-on-surface-variant sm:px-2 sm:text-xs sm:leading-relaxed">
          {t("footer.loveCreditPre")}
          <a
            href={METRODOKU_URL}
            className={cn("text-on-surface-variant", linkClass)}
            rel="noopener noreferrer"
            target="_blank"
          >
            Metrodoku
          </a>
          {t("footer.loveCreditPost")}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 font-sans text-[10px] text-on-surface-variant sm:gap-x-2 sm:gap-y-1 sm:text-xs">
          <a href={`mailto:${SUPPORT_EMAIL}`} className={linkClass}>
            {t("footer.contact")}
          </a>
          <Middot />
          <span>{t("footer.copyright", { year })}</span>
          <Middot />
          <LocaleSwitcher />
        </div>
      </div>
    </footer>
  );
}
