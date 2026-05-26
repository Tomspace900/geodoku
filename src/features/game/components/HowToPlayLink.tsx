import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useT } from "@/i18n/LocaleContext";
import { HelpCircle } from "lucide-react";
import { useState } from "react";
import { AccentBar } from "./AccentBar";

const STORAGE_KEY = "geodoku.showHowToPlay";

function readShow(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "false";
  } catch {
    return true;
  }
}

function writeShow(value: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    // localStorage indisponible (mode privé Safari, quota…), on ignore.
  }
}

export function HowToPlayLink() {
  const [show, setShow] = useState<boolean>(() => readShow());
  const [open, setOpen] = useState<boolean>(show);
  const t = useT();

  function handleDontShowChange(checked: boolean) {
    const nextShow = !checked;
    setShow(nextShow);
    writeShow(nextShow);
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="self-center gap-1.5 text-xs tracking-wide"
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
            <AccentBar className="mt-3" />
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
          <label
            htmlFor="howtoplay-dont-show"
            className="flex items-center gap-2 pt-2 text-xs text-on-surface-variant cursor-pointer select-none"
          >
            <Checkbox
              id="howtoplay-dont-show"
              checked={!show}
              onCheckedChange={(v) => handleDontShowChange(v === true)}
            />
            <span>{t("howToPlay.dontShowAgain")}</span>
          </label>
        </DialogContent>
      </Dialog>
    </>
  );
}
