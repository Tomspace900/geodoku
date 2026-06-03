import AppFooter from "@/app/AppFooter";
import { AppMark } from "@/components/AppMark";
import { DisplayHeader } from "@/components/editorial/DisplayHeader";
import { useT } from "@/i18n/LocaleContext";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

const SUPPORT_EMAIL = "support.geodoku@gmail.com";
const KOFI_URL = "https://ko-fi.com/geodoku";

const inlineLinkClass =
  "text-on-surface font-medium underline underline-offset-2 decoration-outline-variant/40 transition-colors hover:decoration-on-surface";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-serif text-xl font-medium text-on-surface">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Body({ children }: { children: ReactNode }) {
  return (
    <p className="font-sans text-sm leading-relaxed text-on-surface-variant">
      {children}
    </p>
  );
}

export function PrivacyPage() {
  const t = useT();

  return (
    <div className="min-h-svh bg-surface flex flex-col items-center px-4 py-6">
      <div className="w-full max-w-2xl flex flex-col gap-8 flex-1">
        <header className="flex flex-col gap-5">
          <a
            href="/"
            className="inline-flex w-fit items-center gap-1.5 font-sans text-xs text-on-surface-variant underline-offset-2 transition-colors hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-surface/20 focus-visible:ring-offset-2 focus-visible:ring-offset-surface rounded-sm"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            {t("privacy.backToGame")}
          </a>

          <DisplayHeader
            as="h1"
            size="lg"
            leftIcon={<AppMark />}
            title={t("privacy.title")}
            eyebrow={t("privacy.eyebrow")}
          />

          <p className="max-w-prose font-sans text-base leading-relaxed text-on-surface-variant">
            {t("privacy.lead")}
          </p>

          <p className="font-sans text-[10px] uppercase tracking-widest text-on-surface-variant/70">
            {t("privacy.updatedLabel")} · {t("privacy.updatedValue")}
          </p>
        </header>

        <div className="flex flex-col gap-7">
          <Section title={t("privacy.essenceTitle")}>
            <Body>{t("privacy.essenceBody")}</Body>
          </Section>

          <Section title={t("privacy.deviceTitle")}>
            <Body>{t("privacy.deviceBody")}</Body>
          </Section>

          <Section title={t("privacy.serverTitle")}>
            <Body>{t("privacy.serverBody")}</Body>
          </Section>

          <Section title={t("privacy.thirdPartyTitle")}>
            <Body>{t("privacy.thirdPartyBody")}</Body>
          </Section>

          <Section title={t("privacy.rightsTitle")}>
            <Body>{t("privacy.rightsBody")}</Body>
          </Section>

          <Section title={t("privacy.supportTitle")}>
            <Body>
              {t("privacy.supportBodyPre")}{" "}
              <a
                href={KOFI_URL}
                className={inlineLinkClass}
                rel="noopener noreferrer"
                target="_blank"
              >
                Ko-fi
              </a>
              .
            </Body>
          </Section>

          <Section title={t("privacy.contactTitle")}>
            <Body>
              {t("privacy.contactBodyPre")}{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className={inlineLinkClass}>
                {SUPPORT_EMAIL}
              </a>
              .
            </Body>
          </Section>
        </div>
      </div>

      <AppFooter className="mt-auto w-full shrink-0" />
    </div>
  );
}
