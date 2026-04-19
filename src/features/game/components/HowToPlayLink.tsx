import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useT } from "@/i18n/LocaleContext";
import { HelpCircle } from "lucide-react";
import { useState } from "react";

export function HowToPlayLink() {
  const [open, setOpen] = useState(false);
  const t = useT();

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="self-center gap-1.5 text-on-surface-variant text-xs tracking-wide"
      >
        <HelpCircle size={13} />
        {t("ui.howToPlay")}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader className="items-start space-y-0 text-left sm:text-left">
            <DialogTitle className="font-serif text-2xl font-medium italic tracking-normal text-on-surface leading-none">
              {t("howToPlay.title")}
            </DialogTitle>
            <div
              aria-hidden
              className="mt-3 h-1 w-12 shrink-0 rounded-full bg-brand"
            />
          </DialogHeader>
          <div className="space-y-3 text-sm text-on-surface-variant leading-relaxed">
            <p>
              {t("howToPlay.p1pre")}{" "}
              <strong className="font-medium text-on-surface">
                {t("howToPlay.p1bold1")}
              </strong>{" "}
              {t("howToPlay.p1mid")}{" "}
              <strong className="font-medium text-brand">
                {t("howToPlay.p1bold2")}
              </strong>
              .
            </p>
            <p>
              {t("howToPlay.p2")}{" "}
              <span className="font-medium text-brand">
                {t("howToPlay.p2warn")}
              </span>
            </p>
            <p>
              {t("howToPlay.p3pre")}{" "}
              <strong className="font-medium text-on-surface">
                {t("howToPlay.p3bold")}
              </strong>
              . {t("howToPlay.p3post")}
            </p>
            <p>{t("howToPlay.p4")}</p>
            <ul className="space-y-1 pl-1">
              <li>{t("howToPlay.li1")}</li>
              <li>{t("howToPlay.li2")}</li>
              <li>{t("howToPlay.li3")}</li>
              <li>{t("howToPlay.li4")}</li>
            </ul>
            <p className="italic text-xs">{t("howToPlay.tip")}</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
