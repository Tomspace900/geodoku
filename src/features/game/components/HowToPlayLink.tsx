import { AccentBar } from "@/components/editorial/AccentBar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useT } from "@/i18n/LocaleContext";
import type { TKey } from "@/i18n/types";
import { usePostHog } from "@posthog/react";
import { Ban, Gem, Grid3x3, Heart, HelpCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "geodoku.showHowToPlay";

const RULES: { icon: LucideIcon; titleKey: TKey; bodyKey: TKey }[] = [
  {
    icon: Grid3x3,
    titleKey: "howToPlay.rule1Title",
    bodyKey: "howToPlay.rule1Body",
  },
  {
    icon: Ban,
    titleKey: "howToPlay.rule2Title",
    bodyKey: "howToPlay.rule2Body",
  },
  {
    icon: Heart,
    titleKey: "howToPlay.rule3Title",
    bodyKey: "howToPlay.rule3Body",
  },
  {
    icon: Gem,
    titleKey: "howToPlay.rule4Title",
    bodyKey: "howToPlay.rule4Body",
  },
];

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
  const posthog = usePostHog();
  const [show, setShow] = useState<boolean>(() => readShow());
  const [open, setOpen] = useState<boolean>(show);
  const openedAtRef = useRef<number | null>(null);
  const openTriggerRef = useRef<"auto_first_visit" | "manual">("manual");
  const autoOpenCapturedRef = useRef(false);
  const t = useT();

  function beginOpen(trigger: "auto_first_visit" | "manual") {
    openTriggerRef.current = trigger;
    openedAtRef.current = Date.now();
    posthog?.capture("how_to_play_opened", { trigger });
    setOpen(true);
  }

  function captureClosed(dontShowAgain: boolean) {
    if (openedAtRef.current === null) return;
    posthog?.capture("how_to_play_closed", {
      trigger: openTriggerRef.current,
      duration_ms: Date.now() - openedAtRef.current,
      dont_show_again: dontShowAgain,
    });
    openedAtRef.current = null;
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: fire once on mount for auto-popup only
  useEffect(() => {
    if (!show || autoOpenCapturedRef.current) return;
    autoOpenCapturedRef.current = true;
    openTriggerRef.current = "auto_first_visit";
    openedAtRef.current = Date.now();
    posthog?.capture("how_to_play_opened", { trigger: "auto_first_visit" });
  }, []);

  function handleDontShowChange(checked: boolean) {
    const nextShow = !checked;
    setShow(nextShow);
    writeShow(nextShow);
    posthog?.capture("how_to_play_dont_show_toggled", {
      dont_show_again: checked,
    });
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => beginOpen("manual")}
        className="self-center gap-1.5 text-xs tracking-wide"
      >
        <HelpCircle size={13} />
        {t("ui.howToPlay")}
      </Button>

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            captureClosed(!show);
            setOpen(false);
            return;
          }
          if (!openedAtRef.current) {
            beginOpen("manual");
            return;
          }
          setOpen(true);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader className="items-start space-y-0 text-left sm:text-left">
            <DialogTitle className="font-serif text-2xl font-medium italic tracking-normal text-on-surface leading-none">
              {t("howToPlay.title")}
            </DialogTitle>
            <AccentBar className="mt-3" />
          </DialogHeader>

          <ol className="space-y-4">
            {RULES.map(({ icon: Icon, titleKey, bodyKey }) => (
              <li key={titleKey} className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand/10 text-brand">
                  <Icon size={17} strokeWidth={2} />
                </span>
                <div className="space-y-0.5 pt-0.5">
                  <p className="font-sans text-sm font-semibold text-on-surface leading-snug">
                    {t(titleKey)}
                  </p>
                  <p className="font-sans text-xs text-on-surface-variant leading-relaxed">
                    {t(bodyKey)}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <label
            htmlFor="howtoplay-dont-show"
            className="flex items-center gap-2 text-xs text-on-surface-variant cursor-pointer select-none"
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
