import { GridMatrix } from "@/features/game/components/GridMatrix";
import { SolutionLayerCell } from "@/features/game/components/SolutionLayerCell";
import {
  CONSTRAINT_BY_ID,
  type Constraint,
} from "@/features/game/logic/constraints";
import { toCellKey } from "@/features/game/logic/gridTopology";
import { useLocale } from "@/i18n/LocaleContext";
import type { DayResult } from "../logic/myStats";

/** Même rendu qu'un en-tête de la grille, sans bouton : rien ne s'ouvre ici. */
function StaticHeader({ label }: { label: string }) {
  return (
    <span className="flex min-h-[52px] items-center justify-center whitespace-normal p-1.5 text-center text-[10px] font-medium leading-tight text-on-surface-variant sm:text-xs">
      {label}
    </span>
  );
}

/**
 * La grille d'un jour, figée : pays et part, tiret pour une case vide, croix
 * pour une case bloquée, comme le calque « Ma grille » de la grille solution.
 */
export function FrozenGrid({
  result,
  ariaLabel,
}: {
  result: DayResult;
  ariaLabel: string;
}) {
  const { t } = useLocale();
  const byId: ReadonlyMap<string, Constraint> = CONSTRAINT_BY_ID;
  const label = (id: string) => {
    const constraint = byId.get(id);
    return constraint ? t(constraint.labelKey) : id;
  };
  return (
    <GridMatrix
      ariaLabel={ariaLabel}
      rowLabels={result.rows.map(label)}
      colLabels={result.cols.map(label)}
      renderColumnHeader={(text) => <StaticHeader label={text} />}
      renderRowHeader={(text) => <StaticHeader label={text} />}
      renderCell={({ row, col }) => {
        const key = toCellKey({ row, col });
        return (
          <div className="relative isolate flex aspect-square w-full flex-col items-center justify-center gap-0.5 rounded-xl bg-surface-lowest p-1 text-center shadow-editorial">
            <SolutionLayerCell
              layer="choices"
              failureRate={null}
              ownFailures={result.failed[key]}
              best={null}
              userCell={result.cells[key]}
              userShare={result.shares[key] ?? null}
            />
          </div>
        );
      }}
    />
  );
}
