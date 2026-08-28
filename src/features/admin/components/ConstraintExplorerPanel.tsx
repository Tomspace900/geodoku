import { Search, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CONSTRAINTS,
  type ConstraintId,
  constraintAnswers,
} from "@/features/game/logic/constraints";
import { useT } from "@/i18n/LocaleContext";
// `content/` est terminal : import relatif, jamais l'alias `@/`.
import { COUNTRY_CATALOG } from "../../../../content/countries/catalog";
import {
  type ConstraintAnswerSets,
  constraintCandidateMetric,
  intersectSelectedConstraints,
} from "../logic/constraintExplorer";
import { PanelCard } from "./PanelCard";
import { PanelHeader } from "./PanelHeader";

const COUNTRIES = COUNTRY_CATALOG;
// Clé `string` : les listes de réponses sont des `ReadonlySet<string>`.
const COUNTRY_BY_CODE = new Map<string, (typeof COUNTRIES)[number]>(
  COUNTRIES.map((country) => [country.iso3, country]),
);
const ANSWER_SETS: ConstraintAnswerSets = new Map(
  CONSTRAINTS.map(({ id }) => [id, constraintAnswers(id)]),
);

function normalizeSearch(value: string): string {
  return value
    .toLocaleLowerCase("fr")
    .normalize("NFD")
    .replace(/\p{Mn}/gu, "")
    .trim();
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)} %`;
}

type ExplorerOption = {
  id: ConstraintId;
  label: string;
  answerCount: number;
  resultingCount: number;
  overlapCoefficient: number;
};

export function ConstraintExplorerPanel() {
  const t = useT();
  const [selectedIds, setSelectedIds] = useState<ConstraintId[]>([]);
  const [query, setQuery] = useState("");
  const selectedAnswers = intersectSelectedConstraints(
    selectedIds,
    ANSWER_SETS,
  );
  const hasSelection = selectedIds.length > 0;
  const normalizedQuery = normalizeSearch(query);
  const selectedConstraints = selectedIds.map((constraintId) => {
    const constraint = CONSTRAINTS.find(({ id }) => id === constraintId);
    if (!constraint) throw new Error(`Unknown constraint: ${constraintId}`);
    return { ...constraint, label: t(constraint.labelKey) };
  });
  const options: ExplorerOption[] = CONSTRAINTS.filter(
    ({ id }) => !selectedIds.includes(id),
  )
    .map((constraint) => {
      const answers = ANSWER_SETS.get(constraint.id) ?? new Set<string>();
      const metric = constraintCandidateMetric(selectedAnswers, answers);
      return {
        id: constraint.id,
        label: t(constraint.labelKey),
        answerCount: answers.size,
        ...metric,
      };
    })
    .filter(({ id, label }) =>
      normalizeSearch(`${label} ${id}`).includes(normalizedQuery),
    )
    .sort((left, right) => {
      if (hasSelection) {
        const byOverlap = right.overlapCoefficient - left.overlapCoefficient;
        if (byOverlap !== 0) return byOverlap;
        const byResultingCount = right.resultingCount - left.resultingCount;
        if (byResultingCount !== 0) return byResultingCount;
      }
      return left.label.localeCompare(right.label, "fr");
    });
  const matchingCountries = [...selectedAnswers]
    .flatMap((countryCode) => {
      const country = COUNTRY_BY_CODE.get(countryCode);
      return country ? [country] : [];
    })
    .sort((left, right) => left.names.fr.localeCompare(right.names.fr, "fr"));

  function toggleConstraint(constraintId: ConstraintId) {
    setSelectedIds((current) =>
      current.includes(constraintId)
        ? current.filter((id) => id !== constraintId)
        : [...current, constraintId],
    );
  }

  return (
    <PanelCard>
      <PanelHeader title="Explorateur de contraintes">
        <Button
          type="button"
          variant="ghost"
          size="auto"
          disabled={!hasSelection}
          onClick={() => setSelectedIds([])}
          className="ml-auto text-xs"
        >
          Réinitialiser
        </Button>
      </PanelHeader>

      <p className="mb-4 max-w-3xl text-xs leading-relaxed text-on-surface-variant">
        Sélectionne plusieurs contraintes pour voir leur intersection. Le
        chevauchement utilise le même coefficient que le générateur ; le nombre
        suivant indique les pays qui resteraient après ajout.
      </p>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(18rem,2fr)]">
        <div className="min-w-0 space-y-4">
          <div className="rounded-lg bg-surface-lowest p-4">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-serif text-xl font-medium text-on-surface">
                Sélection
              </p>
              <p className="text-xs tabular-nums text-on-surface-variant">
                {selectedIds.length} contrainte
                {selectedIds.length === 1 ? "" : "s"}
              </p>
            </div>

            {selectedConstraints.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedConstraints.map(({ id, label }) => (
                  <Button
                    key={id}
                    type="button"
                    size="sm"
                    aria-pressed="true"
                    aria-label={`Retirer ${label}`}
                    onClick={() => toggleConstraint(id)}
                    className="h-auto min-h-8 rounded-full px-3 py-1.5 text-left text-xs whitespace-normal"
                  >
                    <span>{label}</span>
                    <X aria-hidden="true" />
                  </Button>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-on-surface-variant">
                Aucune contrainte sélectionnée.
              </p>
            )}
          </div>

          <div className="rounded-lg bg-surface-lowest p-4">
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-0 top-1/2 size-4 -translate-y-1/2 text-on-surface-variant"
              />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Rechercher une contrainte"
                aria-label="Rechercher une contrainte"
                className="pl-6"
              />
            </div>

            <div className="mt-3 flex max-h-[30rem] flex-wrap content-start gap-2 overflow-y-auto pr-1">
              {options.map((option) => {
                const metric = hasSelection
                  ? `${formatPercent(option.overlapCoefficient)} · ${option.resultingCount} pays`
                  : `${option.answerCount} pays`;
                return (
                  <Button
                    key={option.id}
                    type="button"
                    variant="secondary"
                    size="sm"
                    aria-pressed="false"
                    aria-label={`Ajouter ${option.label}, ${metric}`}
                    onClick={() => toggleConstraint(option.id)}
                    className="h-auto min-h-8 rounded-full px-3 py-1.5 text-left text-xs whitespace-normal"
                    title={
                      hasSelection
                        ? `${metric} — coefficient d’intersection sur le plus petit ensemble`
                        : metric
                    }
                  >
                    <span>{option.label}</span>
                    <span className="tabular-nums text-on-surface-variant">
                      {metric}
                    </span>
                  </Button>
                );
              })}
              {options.length === 0 && (
                <p className="py-3 text-sm text-on-surface-variant">
                  Aucune contrainte trouvée.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-surface-lowest p-4">
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-serif text-xl font-medium text-on-surface">
              Pays compatibles
            </p>
            <p className="text-xs tabular-nums text-on-surface-variant">
              {hasSelection ? matchingCountries.length : "—"} /{" "}
              {COUNTRIES.length}
            </p>
          </div>

          {hasSelection ? (
            matchingCountries.length > 0 ? (
              <ul className="mt-3 grid max-h-[36rem] grid-cols-1 gap-1 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                {matchingCountries.map((country) => (
                  <li
                    key={country.iso3}
                    className="flex min-w-0 items-center gap-2 rounded-md bg-surface-low px-2.5 py-2"
                  >
                    <span className="text-base" aria-hidden="true">
                      {country.flagEmoji}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs text-on-surface">
                      {country.names.fr}
                    </span>
                    <span className="text-[10px] tabular-nums text-on-surface-variant">
                      {country.iso3}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 rounded-lg bg-warning/10 p-3 text-sm text-warning">
                Aucun pays ne satisfait cette combinaison.
              </p>
            )
          ) : (
            <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
              Sélectionne une première contrainte pour afficher les pays et
              comparer les chevauchements.
            </p>
          )}
        </div>
      </div>
    </PanelCard>
  );
}
