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
    <footer className={cn("flex justify-center pb-2 pt-10 px-2", className)}>
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1">
          <span className="font-serif text-lg font-medium italic text-on-surface md:text-xl">
            {t("ui.appName")}
          </span>
          <span className="font-sans text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant">
            {t("footer.betaMark")}
          </span>
        </div>

        <p className="max-w-md px-2 font-sans text-xs leading-relaxed text-on-surface-variant">
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

        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 font-sans text-xs text-on-surface-variant">
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
