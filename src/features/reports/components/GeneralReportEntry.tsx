import { Flag } from "lucide-react";
import { useState } from "react";
import { useLocation } from "react-router";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/i18n/LocaleContext";
import { stripLocale } from "@/i18n/localePath";
import { cn } from "@/lib/utils";
import { useReportSubmit } from "../hooks/useReportSubmit";
import { reportPage } from "../logic/report";
import { ReportDrawer } from "./ReportDrawer";

/**
 * « ⚑ Signaler », sur la dernière ligne du pied de page (#127) : un bug ou
 * tout le reste, « Bug ou autre » présélectionné. La page part avec, sans la
 * langue ; aucune case ni contrainte.
 */
export function GeneralReportEntry({ className }: { className?: string }) {
  const { t } = useLocale();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const report = useReportSubmit({
    source: "footer",
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
        className={cn(
          "inline-flex gap-1 text-[10px] font-normal text-on-surface-variant sm:text-xs [&_svg]:size-3 sm:[&_svg]:size-3.5",
          className,
        )}
      >
        <Flag aria-hidden />
        {t("report.entryShort")}
      </Button>
      <ReportDrawer
        open={open}
        onOpenChange={setOpen}
        title={t("report.footerTitle")}
        initialCategory="bug"
        onSubmit={report.submit}
      />
    </>
  );
}
