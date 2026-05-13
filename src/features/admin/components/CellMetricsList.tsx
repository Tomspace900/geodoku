import {
  concentrationIndex,
  formatPercent,
} from "@/features/admin/logic/cellMetrics";
import {
  constraintLabel,
  difficultyPillClass,
} from "@/features/admin/logic/display";
import { getCountryByCode } from "@/features/countries/lib/search";
import { cn } from "@/lib/utils";

type CellMetric = {
  totalGuesses: number;
  distinctCountries: number;
  validAnswersCount: number;
  coverage: number;
  fillRate: number | null;
  observedDifficulty100: number | null;
  estimatedDifficulty: number | null;
  topAnswers: Array<{ countryCode: string; count: number; share: number }>;
  missingCountries: string[];
};

type CellMetricsData = {
  gamesPlayed: number;
  wins: number;
  losses: number;
  cells: Record<string, CellMetric>;
};

type Props = {
  metrics: CellMetricsData | null | undefined;
  rows: string[];
  cols: string[];
};

const MAX_MISSING_DISPLAYED = 6;

function CountryChip({
  code,
  share,
}: {
  code: string;
  share: number | null;
}) {
  const country = getCountryByCode(code);
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-surface-low px-1.5 py-0.5 text-[11px] font-medium text-on-surface leading-none">
      <span aria-hidden="true" className="shrink-0 text-[11px] leading-none">
        {country?.flagEmoji ?? "🏳️"}
      </span>
      <span className="min-w-0 truncate">{code}</span>
      {share !== null && (
        <span className="shrink-0 text-on-surface-variant tabular-nums">
          {formatPercent(share)}
        </span>
      )}
    </span>
  );
}

function CellCard({
  rowLabel,
  colLabel,
  metric,
  gamesPlayed,
}: {
  rowLabel: string;
  colLabel: string;
  metric: CellMetric;
  gamesPlayed: number;
}) {
  const hasObservedDifficulty = metric.observedDifficulty100 !== null;
  const concentration = concentrationIndex(metric.topAnswers);

  const missingShown = metric.missingCountries.slice(0, MAX_MISSING_DISPLAYED);
  const missingHidden = Math.max(
    0,
    metric.missingCountries.length - MAX_MISSING_DISPLAYED,
  );

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-surface-lowest p-4">
      <div>
        <p className="text-[10px] font-semibold tracking-widest text-on-surface-variant uppercase">
          {rowLabel} <span className="text-on-surface-variant/60">×</span>{" "}
          {colLabel}
        </p>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-serif text-3xl font-medium text-brand tabular-nums leading-none">
            {hasObservedDifficulty ? metric.observedDifficulty100 : "—"}
          </span>
          <span className="text-[10px] tracking-widest text-on-surface-variant uppercase">
            difficulté observée
          </span>
          {metric.estimatedDifficulty !== null && (
            <span
              className={cn(
                "ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums",
                difficultyPillClass(metric.estimatedDifficulty),
              )}
              title="Difficulté estimée par le générateur"
            >
              estimée {metric.estimatedDifficulty}
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-on-surface-variant">
          {gamesPlayed === 0 ? (
            "Aucun joueur n'a encore terminé cette grille."
          ) : (
            <>
              <span className="tabular-nums text-on-surface">
                {metric.totalGuesses}
              </span>
              {" / "}
              <span className="tabular-nums">{gamesPlayed}</span>
              {" joueurs ont rempli cette case"}
              {metric.fillRate !== null && (
                <>
                  {" · "}
                  <span className="tabular-nums">
                    {formatPercent(metric.fillRate)}
                  </span>
                </>
              )}
            </>
          )}
        </p>
      </div>

      {metric.topAnswers.length > 0 && (
        <div>
          <p className="mb-1.5 text-[10px] font-semibold tracking-widest text-on-surface-variant uppercase">
            Pays les plus choisis
          </p>
          <div className="flex flex-wrap gap-1">
            {metric.topAnswers.slice(0, 3).map((ans) => (
              <CountryChip
                key={ans.countryCode}
                code={ans.countryCode}
                share={ans.share}
              />
            ))}
          </div>
          {concentration > 0.5 && (
            <p className="mt-1.5 text-[11px] italic text-on-surface-variant">
              Réponse dominante : top-1 à {formatPercent(concentration)}.
            </p>
          )}
        </div>
      )}

      <div className="text-xs text-on-surface-variant">
        <p>
          Couverture{" "}
          <span className="tabular-nums text-on-surface">
            {metric.distinctCountries}
          </span>
          {" / "}
          <span className="tabular-nums">{metric.validAnswersCount}</span>
          {" du pool"}
          {metric.validAnswersCount > 0 && (
            <>
              {" · "}
              <span className="tabular-nums">
                {formatPercent(metric.coverage)}
              </span>
            </>
          )}
        </p>
        {missingShown.length > 0 && (
          <p className="mt-1.5">
            <span className="text-on-surface-variant/70">
              Jamais trouvés ({metric.missingCountries.length}) :
            </span>{" "}
            <span className="text-on-surface">
              {missingShown.join(", ")}
              {missingHidden > 0 ? `, +${missingHidden}` : ""}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

export function CellMetricsList({ metrics, rows, cols }: Props) {
  if (metrics === undefined) {
    return (
      <section className="rounded-2xl bg-surface-low p-4 md:p-5">
        <p className="text-[10px] font-semibold tracking-widest text-on-surface-variant uppercase">
          Métriques observées
        </p>
        <p className="mt-3 text-sm text-on-surface-variant">Chargement…</p>
      </section>
    );
  }

  if (metrics === null) return null;

  const winRate =
    metrics.gamesPlayed === 0 ? null : metrics.wins / metrics.gamesPlayed;

  return (
    <section className="rounded-2xl bg-surface-low p-4 md:p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[10px] font-semibold tracking-widest text-on-surface-variant uppercase">
          Métriques observées
        </p>
        <p className="text-xs text-on-surface-variant">
          {metrics.gamesPlayed === 0 ? (
            "Aucun joueur n'a encore terminé cette grille."
          ) : (
            <>
              <span className="tabular-nums text-on-surface">
                {metrics.gamesPlayed}
              </span>
              {" joueurs · "}
              <span className="tabular-nums text-on-surface">
                {winRate !== null ? formatPercent(winRate) : "—"}
              </span>
              {" de réussite"}
            </>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {rows.flatMap((rowId, r) =>
          cols.map((colId, c) => {
            const key = `${r},${c}`;
            const metric = metrics.cells[key];
            if (!metric) return null;
            return (
              <CellCard
                key={key}
                rowLabel={constraintLabel(rowId)}
                colLabel={constraintLabel(colId)}
                metric={metric}
                gamesPlayed={metrics.gamesPlayed}
              />
            );
          }),
        )}
      </div>
    </section>
  );
}
