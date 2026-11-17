import {
  cellRatePillClass,
  constraintLabel,
  formatRate,
  popularityPillClass,
} from "@/features/admin/logic/display";
import {
  popularityScore100,
  topKPopularity,
} from "@/features/countries/logic/popularity";
import { getCountryByIso3 } from "@/features/countries/logic/search";
import { GridMatrix } from "@/features/game/components/GridMatrix";
import { cn } from "@/lib/utils";
import { StatScorePill } from "./StatGlyph";

const headerClass =
  "flex items-center justify-center text-center text-[10px] font-medium text-on-surface-variant bg-surface-low rounded-xl p-1.5 leading-tight min-h-[52px]";

/** Taux observés d'une case, parmi les parties finies (`null` = cohorte trop mince). */
export type CellRates = { erred: number | null; leftEmpty: number | null };

/** Métriques observées d'une case (grille passée / active). */
export type ObservedCell = {
  /** Distribution des choix : countryCode → nb de fois choisi. */
  picks: Record<string, number>;
  /** `null` avant la bascule : la journée n'a pas de lignes de partie. */
  rates: CellRates | null;
};

type GridPreviewData = {
  rows: string[];
  cols: string[];
  validAnswers: Record<string, string[]>;
  // Métriques OBSERVÉES par case (grilles passées / active).
  observed?: Record<string, ObservedCell> | null;
};

/** Trie les codes par nb de choix décroissant, puis alphabétique. */
function sortByPicks(codes: string[], picks: Record<string, number>): string[] {
  return [...codes].sort((a, b) => {
    const diff = (picks[b] ?? 0) - (picks[a] ?? 0);
    return diff !== 0 ? diff : a.localeCompare(b);
  });
}

export function GridPreview({
  rows,
  cols,
  validAnswers,
  observed,
}: GridPreviewData) {
  const rowLabels = rows.map(constraintLabel);
  const colLabels = cols.map(constraintLabel);

  return (
    <GridMatrix
      ariaLabel="Aperçu de la grille"
      rowLabels={rowLabels}
      colLabels={colLabels}
      renderColumnHeader={(label) => <div className={headerClass}>{label}</div>}
      renderRowHeader={(label) => <div className={headerClass}>{label}</div>}
      renderCell={({ row, col }) => {
        const key = `${row},${col}`;
        const obs = observed?.[key];
        const codes = obs
          ? sortByPicks(validAnswers[key] ?? [], obs.picks)
          : (validAnswers[key] ?? []);
        // Facilité estimée de la case (0–100, vert = solutions connues).
        const popScore = popularityScore100(
          topKPopularity(validAnswers[key] ?? []),
        );

        return (
          <div className="flex aspect-square w-full min-h-0 flex-col rounded-xl bg-surface-lowest p-1.5 shadow-editorial">
            <div className="flex min-h-0 flex-1 flex-wrap content-start gap-1 overflow-y-auto">
              {codes.map((code) => {
                const country = getCountryByIso3(code);
                const count = obs?.picks[code] ?? 0;
                const dim = obs ? count === 0 : false;
                return (
                  <span
                    key={`${key}-${code}`}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md bg-surface-low px-1.5 py-0.5 text-[11px] font-medium leading-none text-on-surface",
                      dim && "opacity-40",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className="shrink-0 text-[11px] leading-none"
                    >
                      {country?.flagEmoji ?? "🏳️"}
                    </span>
                    <span className="min-w-0 truncate">{code}</span>
                    {obs && count > 0 && (
                      <span className="shrink-0 tabular-nums text-on-surface-variant">
                        {count}
                      </span>
                    )}
                  </span>
                );
              })}
              {codes.length === 0 && (
                <span className="text-[11px] text-on-surface-variant">
                  Aucun pays
                </span>
              )}
            </div>

            <div className="mt-1 flex shrink-0 flex-col gap-1">
              <div className="flex items-center">
                <StatScorePill
                  kind="faciliteEst"
                  score={popScore}
                  pillClass={popularityPillClass(popScore)}
                  title="Facilité estimée"
                />
              </div>
              {obs?.rates && (
                <div className="flex items-center gap-1">
                  <StatScorePill
                    kind="trompes"
                    score={formatRate(obs.rates.erred)}
                    pillClass={cellRatePillClass(obs.rates.erred)}
                    title="Parties finies où le joueur s'est trompé sur la case"
                  />
                  <StatScorePill
                    kind="vides"
                    score={formatRate(obs.rates.leftEmpty)}
                    pillClass={cellRatePillClass(obs.rates.leftEmpty)}
                    title="Parties finies où la case est restée vide"
                  />
                </div>
              )}
            </div>
          </div>
        );
      }}
    />
  );
}
