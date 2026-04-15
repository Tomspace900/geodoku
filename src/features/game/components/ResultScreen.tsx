import { Button } from "@/components/ui/button";
import { MAX_SCORE, SHARE_EMOJIS } from "@/features/game/logic/constants";
import { computeScore } from "@/features/game/logic/rarity";
import {
  copyShareToClipboard,
  formatShareString,
} from "@/features/game/logic/share";
import type { CellKey, GameState } from "@/features/game/types";
import { useT } from "@/i18n/LocaleContext";
import { cn } from "@/lib/utils";
import { Copy } from "lucide-react";
import { useState } from "react";
import { AchievementCard } from "./AchievementCard";

const ROWS = [0, 1, 2] as const;
const COLS = [0, 1, 2] as const;

type Props = {
  state: GameState;
  gridNumber: number;
};

export function ResultScreen({ state, gridNumber }: Props) {
  const [copied, setCopied] = useState(false);
  const t = useT();
  const score = computeScore(state);
  const isWon = state.status === "won";

  async function handleShare() {
    const text = formatShareString(state, gridNumber);
    const ok = await copyShareToClipboard(text);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div
        className={cn(
          "bg-surface-lowest w-full max-w-[500px] shadow-editorial",
          "rounded-t-2xl sm:rounded-2xl",
          "p-6 flex flex-col gap-5",
          "animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300",
        )}
      >
        {/* Title */}
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="font-serif text-3xl italic text-on-surface">
            {isWon ? t("ui.magnificent") : t("ui.tooBad")}
          </h2>
          <div className="w-12 h-1 bg-brand rounded-full" />
          <p className="text-[10px] tracking-widest text-on-surface-variant uppercase mt-1">
            {t("ui.finalResult")}
          </p>
        </div>

        {/* Score */}
        <div className="flex flex-col items-center gap-1">
          <span className="font-serif text-5xl font-medium text-brand">
            {score.percent}%
          </span>
          <span className="text-xs text-on-surface-variant">
            {t("ui.rarityScore", { raw: score.raw, max: MAX_SCORE })}
          </span>
        </div>

        {/* Emoji grid */}
        <div className="flex flex-col items-center gap-1">
          <p className="text-[10px] tracking-widest text-on-surface-variant uppercase mb-1">
            {t("ui.yourGrid")}
          </p>
          {ROWS.map((row) => (
            <div key={row} className="flex gap-1">
              {COLS.map((col) => {
                const cell = state.cells[`${row},${col}` as CellKey];
                const emoji =
                  cell.status === "filled"
                    ? SHARE_EMOJIS[cell.rarityTier]
                    : SHARE_EMOJIS.failed;
                return (
                  <span
                    key={col}
                    className="text-2xl leading-none w-9 h-9 flex items-center justify-center"
                  >
                    {emoji}
                  </span>
                );
              })}
            </div>
          ))}
          <p className="text-xs text-on-surface-variant mt-1">
            #GEODOKU #{gridNumber}
          </p>
        </div>

        {/* Achievement */}
        <AchievementCard state={state} />

        {/* Share button */}
        <Button
          onClick={handleShare}
          className="w-full bg-on-surface text-surface-lowest hover:bg-on-surface/90 gap-2"
          size="lg"
        >
          <Copy size={16} />
          {copied ? t("ui.shareCopied") : t("ui.share")}
        </Button>

        {/* Footer */}
        <p className="text-center text-xs text-on-surface-variant italic">
          {t("ui.comeBackTomorrowGrid")}
        </p>
      </div>
    </div>
  );
}
