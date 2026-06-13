import { predictionDelta } from "@/features/admin/logic/analytics";
import {
  constraintLabel,
  deltaSeverityTextClass,
  difficultyPillClass,
  popularityPillClass,
} from "@/features/admin/logic/display";
import {
  popularityScore100,
  topKPopularity,
} from "@/features/countries/lib/popularity";
import { getCountryByCode } from "@/features/countries/lib/search";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, Gauge, Minus } from "lucide-react";
import { StatGlyph } from "./StatGlyph";

const headerClass =
  "flex items-center justify-center text-center text-[10px] font-medium text-on-surface-variant bg-surface-low rounded-xl p-1.5 leading-tight min-h-[52px]";

/** Métriques observées d'une case (grille passée / active). */
export type ObservedCell = {
  /** Taux de réussite (réussites / essais), `null` si non instrumenté / trop peu d'essais. */
  reussite: number | null;
  reussites: number;
  echecs: number;
  essais: number;
  /** Distribution des choix : countryCode → nb de fois choisi. */
  picks: Record<string, number>;
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

function KdaLine({ cell }: { cell: ObservedCell }) {
  return (
    <span className="flex items-center gap-2">
      <StatGlyph kind="reussites" value={cell.reussites} />
      <StatGlyph kind="echecs" value={cell.echecs} />
      <StatGlyph kind="essais" value={cell.essais} />
    </span>
  );
}

const easePillClass =
  "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums";

/** Badge facilité estimée (jauge + score) — futur et passé (même visuel). */
function EaseBadge({ score }: { score: number }) {
  return (
    <span className={cn(easePillClass, popularityPillClass(score))}>
      <Gauge aria-hidden="true" className="size-3 shrink-0" />
      {score}
    </span>
  );
}

/** Écart inline prédit − observé : flèche de sens + |écart|, teinté sévérité. */
function DeltaInline({
  predicted,
  observed,
}: {
  predicted: number;
  observed: number;
}) {
  const { value, severity } = predictionDelta(predicted, observed);
  const Arrow = value > 0 ? ArrowDown : value < 0 ? ArrowUp : Minus;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[10px] font-medium tabular-nums",
        deltaSeverityTextClass(severity),
      )}
    >
      <Arrow aria-hidden="true" className="size-3 shrink-0" />
      {Math.abs(value)}
    </span>
  );
}

export function GridPreview({
  rows,
  cols,
  validAnswers,
  observed,
}: GridPreviewData) {
  return (
    <div
      className="grid gap-1.5"
      style={{
        gridTemplateColumns: "minmax(0,1fr) repeat(3, minmax(0,1fr))",
      }}
    >
      <div />

      {cols.map((colId) => (
        <div key={colId} className={headerClass}>
          {constraintLabel(colId)}
        </div>
      ))}

      {rows.map((rowId, r) => [
        <div key={`row-${rowId}`} className={headerClass}>
          {constraintLabel(rowId)}
        </div>,

        ...cols.map((colId, c) => {
          const key = `${r},${c}`;
          const obs = observed?.[key];
          const codes = obs
            ? sortByPicks(validAnswers[key] ?? [], obs.picks)
            : (validAnswers[key] ?? []);

          // Facilité estimée de la case (0–100, vert = solutions connues =
          // facile) : seul prédicteur validé du taux d'échec. Picto jauge.
          const popScore = popularityScore100(
            topKPopularity(validAnswers[key] ?? []),
          );
          // Pastille basse : % réussite OBSERVÉ (passé/actif), `—` si non
          // instrumenté ; null pour une grille future (rien d'observé).
          const observedBadge = obs
            ? obs.reussite === null
              ? { cls: "bg-surface-low text-on-surface-variant", text: "—" }
              : {
                  cls: difficultyPillClass((1 - obs.reussite) * 100),
                  text: `${Math.round(obs.reussite * 100)}%`,
                }
            : null;

          return (
            <div
              key={`${rowId}-${colId}`}
              className="flex aspect-square w-full min-h-0 flex-col rounded-xl bg-surface-lowest p-1.5 shadow-editorial"
            >
              <div className="flex min-h-0 flex-1 flex-wrap content-start gap-1 overflow-y-auto">
                {codes.map((code) => {
                  const country = getCountryByCode(code);
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

              {observedBadge ? (
                // Passé : 2 lignes. (1) réussite observée + KDA.
                // (2) facilité estimée + écart prédit/réel.
                <div className="mt-1 flex shrink-0 flex-col gap-1">
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
                        observedBadge.cls,
                      )}
                    >
                      {observedBadge.text}
                    </span>
                    {obs && <KdaLine cell={obs} />}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <EaseBadge score={popScore} />
                    {obs && obs.reussite !== null && (
                      <DeltaInline
                        predicted={popScore}
                        observed={Math.round(obs.reussite * 100)}
                      />
                    )}
                  </div>
                </div>
              ) : (
                // Futur : facilité estimée seule (pas d'observé).
                <div className="mt-1 flex shrink-0 items-center">
                  <EaseBadge score={popScore} />
                </div>
              )}
            </div>
          );
        }),
      ])}
    </div>
  );
}
