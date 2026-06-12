import { LocaleSwitcher } from "@/features/game/components/LocaleSwitcher";
import { isChangelogNewBadgeVisible } from "@/features/legal/logic/changelog";
import { useT } from "@/i18n/LocaleContext";
import { cn } from "@/lib/utils";
import { usePostHog } from "@posthog/react";
import { Coffee, Mail } from "lucide-react";

const SUPPORT_EMAIL = "support.geodoku@gmail.com";
const METRODOKU_URL = "https://metrodoku.fr";
const KOFI_URL = "https://ko-fi.com/geodoku/tip";

type FooterLink = "metrodoku" | "support" | "contact" | "privacy" | "changelog";

function Middot() {
  return (
    <span className="select-none text-outline-variant/40" aria-hidden="true">
      ·
    </span>
  );
}

export default function AppFooter({ className }: { className?: string }) {
  const posthog = usePostHog();
  const t = useT();
  const year = new Date().getFullYear();

  function trackFooterLink(link: FooterLink) {
    posthog?.capture("footer_link_clicked", { link });
  }

  const linkClass =
    "underline underline-offset-2 decoration-outline-variant/40 transition-colors hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-surface/20 focus-visible:ring-offset-2 focus-visible:ring-offset-surface rounded-sm";
  const showChangelogNewBadge = isChangelogNewBadgeVisible();

  return (
    <footer
      className={cn(
        "flex justify-center px-2 pt-6 sm:pt-8 md:pt-10",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-2.5 text-center sm:gap-3 md:gap-4">
        <p className="max-w-md px-1 font-sans text-[10px] leading-snug text-on-surface-variant sm:px-2 sm:text-xs sm:leading-relaxed">
          {t("footer.loveCreditPre")}
          <a
            href={METRODOKU_URL}
            className={cn("text-on-surface-variant", linkClass)}
            rel="noopener noreferrer"
            target="_blank"
            onClick={() => trackFooterLink("metrodoku")}
          >
            Metrodoku
          </a>
          {t("footer.loveCreditPost")}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 font-sans text-[10px] text-on-surface-variant sm:gap-x-2 sm:gap-y-1 sm:text-xs">
          <a
            href={KOFI_URL}
            className={cn(
              "inline-flex items-center gap-1 text-on-surface-variant",
              linkClass,
            )}
            rel="noopener noreferrer"
            target="_blank"
            onClick={() => trackFooterLink("support")}
          >
            <Coffee className="size-3 sm:size-3.5" aria-hidden="true" />
            {t("footer.support")}
          </a>
          <Middot />
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className={cn("inline-flex items-center gap-1", linkClass)}
            onClick={() => trackFooterLink("contact")}
          >
            <Mail className="size-3 sm:size-3.5" aria-hidden="true" />
            {t("footer.contact")}
          </a>
          <Middot />
          <a
            href="/privacy"
            className={linkClass}
            onClick={() => trackFooterLink("privacy")}
          >
            {t("footer.privacy")}
          </a>
          <Middot />
          <span className="inline-flex items-center gap-1">
            {showChangelogNewBadge ? (
              <span className="rounded-full bg-brand/10 px-1 font-sans text-[8px] font-semibold uppercase tracking-wider text-brand no-underline">
                {t("footer.changelogNew")}
              </span>
            ) : null}
            <a
              href="/changelog"
              className={linkClass}
              onClick={() => trackFooterLink("changelog")}
            >
              {t("footer.changelog")}
            </a>
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 font-sans text-[10px] text-on-surface-variant sm:gap-x-2 sm:gap-y-1 sm:text-xs">
          <span>{t("footer.copyright", { year })}</span>
          <Middot />
          <LocaleSwitcher />
        </div>
      </div>
    </footer>
  );
}
