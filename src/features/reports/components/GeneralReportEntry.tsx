import type { ReactNode } from "react";
import { useState } from "react";
import { useLocation } from "react-router";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/i18n/LocaleContext";
import { stripLocale } from "@/i18n/localePath";
import { cn } from "@/lib/utils";
import { type ReportSource, useReportSubmit } from "../hooks/useReportSubmit";
import { reportPage } from "../logic/report";
import { ReportDrawer } from "./ReportDrawer";

/**
 * Signalement sans case ni contrainte (#127), « Bug ou autre » présélectionné :
 * « ⚑ Signaler » du pied de page, « Signaler un problème » d'« À propos ».
 * Le déclencheur prend le texte et le style de l'endroit ; la page part avec,
 * sans la langue.
 */
export function GeneralReportEntry({
  source,
  className,
  children,
}: {
  source: Extract<ReportSource, "footer" | "about">;
  className?: string;
  children: ReactNode;
}) {
  const { t } = useLocale();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const report = useReportSubmit({
    source,
    target: { kind: "general", page: reportPage(stripLocale(pathname)) },
  });

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="auto"
        onClick={() => {
          report.trackOpened();
          setOpen(true);
        }}
        className={cn("rounded-sm font-normal", className)}
      >
        {children}
      </Button>
      <ReportDrawer
        open={open}
        onOpenChange={setOpen}
        title={t("report.generalTitle")}
        initialCategory="bug"
        onSubmit={report.submit}
      />
    </>
  );
}
