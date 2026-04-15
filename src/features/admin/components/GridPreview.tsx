import { getCountryByCode } from "@/features/countries/lib/search";
import { CONSTRAINTS } from "@/features/game/logic/constraints";
import { translate } from "@/i18n/index";

const CONSTRAINT_MAP = new Map(CONSTRAINTS.map((c) => [c.id, c]));

function getConstraintLabel(id: string): string {
  const constraint = CONSTRAINT_MAP.get(id);
  return constraint ? translate("fr", constraint.labelKey) : id;
}

const headerClass =
  "flex items-center justify-center text-center text-[10px] font-medium text-on-surface-variant bg-surface-low rounded-xl p-2 leading-tight min-h-[52px]";

type GridPreviewData = {
  rows: string[];
  cols: string[];
  validAnswers: Record<string, string[]>;
  mode?: "compact" | "detailed";
};

export function GridPreview({
  rows,
  cols,
  validAnswers,
  mode = "compact",
}: GridPreviewData) {
  return (
    <div
      className="grid gap-1.5"
      style={{ gridTemplateColumns: "minmax(0,1fr) repeat(3, minmax(0,1fr))" }}
    >
      {/* Coin vide */}
      <div />

      {/* Headers de colonnes */}
      {cols.map((colId) => (
        <div key={colId} className={`${headerClass} p-1.5`}>
          {getConstraintLabel(colId)}
        </div>
      ))}

      {/* Lignes */}
      {rows.map((rowId, r) => [
        /* Header de ligne */
        <div key={`row-${rowId}`} className={`${headerClass} p-1.5`}>
          {getConstraintLabel(rowId)}
        </div>,

        /* Cellules */
        ...cols.map((_, c) => {
          const key = `${r},${c}`;
          const codes = validAnswers[key] ?? [];
          return (
            <div
              key={key}
              className="aspect-square w-full rounded-xl bg-surface-lowest p-1.5 shadow-editorial overflow-y-auto"
            >
              <div className="flex flex-wrap content-start gap-1">
                {codes.map((code) => {
                  const country = getCountryByCode(code);
                  return (
                    <span
                      key={`${key}-${code}`}
                      className={
                        mode === "detailed"
                          ? "inline-flex max-w-full items-center gap-1 rounded-md bg-surface-low px-2 py-1 text-[10px] font-semibold text-on-surface leading-none"
                          : "inline-flex items-center gap-1 rounded-md bg-surface-low px-1.5 py-0.5 text-[9px] font-medium text-on-surface leading-none"
                      }
                    >
                      <span aria-hidden="true">
                        {country?.flagEmoji ?? "🏳️"}
                      </span>
                      <span className={mode === "detailed" ? "truncate" : ""}>
                        {code}
                      </span>
                    </span>
                  );
                })}
                {codes.length === 0 && (
                  <span className="text-[10px] text-on-surface-variant">
                    Aucun pays
                  </span>
                )}
              </div>
            </div>
          );
        }),
      ])}
    </div>
  );
}
