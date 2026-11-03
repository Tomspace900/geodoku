import { X } from "lucide-react";
import { getCountryByIso3 } from "@/features/countries/logic/search";
import type { SolutionLayer } from "@/features/game/hooks/useSolutionLayer";
import { RARITY_STYLES } from "@/features/game/logic/constants";
import {
  formatRarityPercent,
  rarityToTier,
} from "@/features/game/logic/rarity";
import type { Cell } from "@/features/game/types";
import { useLocale } from "@/i18n/LocaleContext";
import { cn } from "@/lib/utils";

/** Teinte rouge d'une case selon la part des joueurs qui s'y sont trompés. */
const ERROR_HEAT: ReadonlyArray<{ minRate: number; className: string }> = [
  { minRate: 0.3, className: "bg-error/20" },
  { minRate: 0.2, className: "bg-error/10" },
  { minRate: 0.1, className: "bg-error/5" },
];

export function errorHeatClass(rate: number | null): string {
  if (rate === null) return "bg-surface-lowest";
  return (
    ERROR_HEAT.find((step) => rate >= step.minRate)?.className ??
    "bg-surface-lowest"
  );
}

/** Pays, nom et part, partagés par « Meilleur score » et « Tes choix ». */
function CountryPick({ iso, share }: { iso: string; share: number | null }) {
  const { locale } = useLocale();
  const country = getCountryByIso3(iso);
  return (
    <>
      <span className="text-2xl leading-none sm:text-4xl" aria-hidden>
        {country?.flagEmoji ?? "🏳️"}
      </span>
      <span className="w-full truncate text-[10px] font-medium text-on-surface sm:text-sm">
        {country ? country.names[locale] : iso}
      </span>
      {share !== null && (
        <span
          className={cn(
            "rounded-full px-1.5 text-[9px] font-medium tabular-nums sm:text-xs",
            RARITY_STYLES[rarityToTier(share)],
          )}
        >
          {formatRarityPercent(share)}
        </span>
      )}
    </>
  );
}

type Props = {
  layer: Exclude<SolutionLayer, "answers">;
  /** Part des joueurs qui se sont trompés ici ; `null` sur une cohorte mince. */
  failureRate: number | null;
  /** Tes erreurs sur cette case. */
  ownFailures: number;
  /** Pays du meilleur combo pour cette case. */
  best: { iso: string; share: number } | null;
  userCell: Cell;
  /** Part de ton pays, `null` tant que la répartition charge. */
  userShare: number | null;
};

/**
 * Contenu d'une case de la grille solution hors calque « Réponses » (#70).
 * Le bouton qui l'entoure, et le tiroir qu'il ouvre, restent ceux de la case.
 */
export function SolutionLayerCell({
  layer,
  failureRate,
  ownFailures,
  best,
  userCell,
  userShare,
}: Props) {
  const { t } = useLocale();

  if (layer === "errors") {
    return (
      <>
        {failureRate !== null && (
          <>
            <span className="font-serif text-xl font-medium tabular-nums text-on-surface sm:text-3xl">
              {formatRarityPercent(failureRate)}
            </span>
            <span className="text-[9px] text-on-surface-variant sm:text-xs">
              {t("ui.errorRateLabel")}
            </span>
          </>
        )}
        {ownFailures > 0 && (
          <span
            className="mt-0.5 flex flex-wrap items-center justify-center gap-0.5"
            role="img"
            aria-label={t("ui.ownErrorsAriaLabel", { count: ownFailures })}
          >
            {Array.from({ length: ownFailures }, (_, index) => (
              <X
                // biome-ignore lint/suspicious/noArrayIndexKey: une croix par erreur
                key={index}
                className="size-3 text-error sm:size-4"
                strokeWidth={3}
                aria-hidden
              />
            ))}
          </span>
        )}
      </>
    );
  }

  if (layer === "best") {
    return best ? <CountryPick iso={best.iso} share={best.share} /> : null;
  }

  if (userCell.status === "filled") {
    return <CountryPick iso={userCell.countryCode} share={userShare} />;
  }
  return (
    <span className="text-[10px] italic text-on-surface-variant sm:text-xs">
      {t(userCell.status === "blocked" ? "ui.cellBlocked" : "ui.cellNotFound")}
    </span>
  );
}
