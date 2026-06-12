import AppFooter from "@/app/AppFooter";
import { AppMark } from "@/components/AppMark";
import { DisplayHeader } from "@/components/editorial/DisplayHeader";
import {
  type LegalAnalyticsPage,
  useLegalPageAnalytics,
} from "@/features/legal/hooks/useLegalPageAnalytics";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  title: string;
  eyebrow: string;
  backLabel: string;
  lead?: string;
  analyticsPage: LegalAnalyticsPage;
  children: ReactNode;
};

/**
 * Coquille éditoriale commune aux pages légales : fond, largeur de lecture,
 * lien retour, en-tête `DisplayHeader` + lead optionnel, et footer collé en bas.
 */
export function LegalLayout({
  title,
  eyebrow,
  backLabel,
  lead,
  analyticsPage,
  children,
}: Props) {
  useLegalPageAnalytics(analyticsPage);

  return (
    <div className="min-h-svh bg-surface flex flex-col items-center px-4 py-6">
      <div className="w-full max-w-2xl flex flex-col gap-8 flex-1">
        <header className="flex flex-col gap-5">
          <a
            href="/"
            className="inline-flex w-fit items-center gap-1.5 font-sans text-xs text-on-surface-variant underline-offset-2 transition-colors hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-surface/20 focus-visible:ring-offset-2 focus-visible:ring-offset-surface rounded-sm"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            {backLabel}
          </a>

          <DisplayHeader
            as="h1"
            size="lg"
            leftIcon={<AppMark />}
            title={title}
            eyebrow={eyebrow}
          />

          {lead ? (
            <p className="max-w-prose font-sans text-base leading-relaxed text-on-surface-variant">
              {lead}
            </p>
          ) : null}
        </header>

        {children}
      </div>

      <AppFooter className="mt-auto w-full shrink-0" />
    </div>
  );
}
