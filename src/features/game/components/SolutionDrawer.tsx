import { ArrowLeft, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  type ConstraintValuesByCountry,
  useConstraintValues,
} from "@/features/countries/hooks/useConstraintValues";
import { formatConstraintValue } from "@/features/countries/logic/constraintValueFormat";
import { getCountryByIso3 } from "@/features/countries/logic/search";
import { ConstraintSourceInfo } from "@/features/game/components/ConstraintSourceInfo";
import type { useSolutionDrawer } from "@/features/game/hooks/useSolutionDrawer";
import { RARITY_STYLES } from "@/features/game/logic/constants";
import {
  CONSTRAINT_BY_ID,
  constraintAnswers,
} from "@/features/game/logic/constraints";
import { CELL_KEYS } from "@/features/game/logic/gridTopology";
import { formatRarityPercent } from "@/features/game/logic/rarity";
import { orderSolutionCountries } from "@/features/game/logic/solutionGridOrder";
import type {
  CellGuessDistribution,
  CellKey,
  GameState,
} from "@/features/game/types";
import { ReportFlagButton } from "@/features/reports/components/ReportFlagButton";
import { ReportForm } from "@/features/reports/components/ReportForm";
import { useReportSubmit } from "@/features/reports/hooks/useReportSubmit";
import {
  formatReportGridDate,
  type ReportTarget,
} from "@/features/reports/logic/report";
import { useLocale } from "@/i18n/LocaleContext";
import type { Locale, Translate } from "@/i18n/types";
import { cn } from "@/lib/utils";

type Props = {
  state: GameState;
  validAnswers: Record<string, string[]>;
  distribution: Record<string, CellGuessDistribution> | undefined;
  /** Taux d'erreur par case (ordre de `CELL_KEYS`), `null` sur une cohorte mince. */
  failureRates: number[] | null;
  drawer: ReturnType<typeof useSolutionDrawer>;
};

/**
 * « 41 % des joueurs se sont trompés ici. » Rien tant que la
 * cohorte est mince : un taux sur trois joueurs ne dit rien.
 */
function CellFailureLine({ rate }: { rate: number }) {
  const { t } = useLocale();
  const [before, after = ""] = t("ui.cellFailureRate").split("{percent}");
  return (
    <p className="flex items-center gap-1.5 px-4 pb-2 text-sm text-on-surface">
      <X className="size-4 shrink-0 text-error" strokeWidth={2.5} aria-hidden />
      <span>
        {before}
        <span className="font-semibold text-error">
          {formatRarityPercent(rate)}
        </span>
        {after}
      </span>
    </p>
  );
}

/**
 * Ligne d'un pays, partagée par les deux listes : drapeau, nom, éventuelle
 * ligne de valeur, puis le contenu de queue (rareté ou valeur). Une ligne
 * d'information, pas un bouton — la liste (`ul`/`li`) en porte la sémantique.
 */
function AnswerRow({
  iso,
  subline,
  trailing,
}: {
  iso: string;
  subline?: string | null;
  trailing?: React.ReactNode;
}) {
  const { locale } = useLocale();
  const country = getCountryByIso3(iso);

  return (
    <li className="flex w-full items-center gap-2 rounded-lg px-2 py-2">
      <span aria-hidden="true" className="shrink-0 text-base">
        {country?.flagEmoji ?? "🏳️"}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium text-on-surface">
          {country ? country.names[locale] : iso}
        </span>
        {subline && (
          <span className="text-xs font-normal text-on-surface-variant">
            {subline}
          </span>
        )}
      </span>
      {trailing}
    </li>
  );
}

/** Ordre alphabétique des noms localisés, partagé par les deux listes. */
function compareCountryNames(locale: Locale) {
  return (a: string, b: string) => {
    const na = getCountryByIso3(a)?.names[locale] ?? a;
    const nb = getCountryByIso3(b)?.names[locale] ?? b;
    return na.localeCompare(nb, locale);
  };
}

/**
 * Valeurs des contraintes de la case pour un pays, jointes en une ligne
 * (« 2ᵉ producteur mondial de cacao · 51 % de forêt »). Vide quand aucune
 * contrainte n'apporte plus que son libellé.
 */
function cellSubline(
  values: ConstraintValuesByCountry,
  iso: string,
  locale: Locale,
  t: Translate,
): string | null {
  const parts = (values.get(iso) ?? []).flatMap((value) =>
    value ? [formatConstraintValue(value, locale, t)] : [],
  );
  return parts.length > 0 ? parts.join(" · ") : null;
}

/** Réponses d'une case : rareté de la cohorte, ordre du plus rare au plus commun. */
function CellListView({
  codes,
  cellDist,
  values,
}: {
  codes: readonly string[];
  cellDist: CellGuessDistribution | undefined;
  values: ConstraintValuesByCountry;
}) {
  const { locale, t } = useLocale();
  const totalGuesses = cellDist?.totalGuesses ?? 0;
  const rarityByCountry = cellDist?.rarityByCountry ?? {};
  const ordered = orderSolutionCountries(
    [...codes],
    totalGuesses,
    rarityByCountry,
    compareCountryNames(locale),
  );
  const hasData = totalGuesses > 0;

  return (
    <ul className="flex flex-col gap-1 overflow-y-auto px-4 pb-4">
      {ordered.map(({ iso, tier }) => (
        <AnswerRow
          key={iso}
          iso={iso}
          subline={cellSubline(values, iso, locale, t)}
          trailing={
            hasData && (
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                  tier ? RARITY_STYLES[tier] : "text-on-surface-variant",
                )}
              >
                {formatRarityPercent(rarityByCountry[iso] ?? 0)}
              </span>
            )
          }
        />
      ))}
    </ul>
  );
}

/**
 * Tous les pays d'une contrainte (active ou archivée), par ordre alphabétique :
 * nom localisé et, quand elle apporte quelque chose, la valeur de la
 * contrainte — pas de rareté, la liste dépasse la case.
 */
function ConstraintListView({
  countries,
  values,
}: {
  countries: readonly string[];
  values: ConstraintValuesByCountry;
}) {
  const { locale, t } = useLocale();
  const ordered = [...countries].sort(compareCountryNames(locale));

  return (
    <ul className="flex flex-col gap-1 overflow-y-auto px-4 pb-4">
      {ordered.map((iso) => {
        const value = cellSubline(values, iso, locale, t);
        return (
          <AnswerRow
            key={iso}
            iso={iso}
            trailing={
              value && (
                <span className="max-w-[50%] text-right text-xs font-normal text-on-surface-variant">
                  {value}
                </span>
              )
            }
          />
        );
      })}
    </ul>
  );
}

/**
 * Drawer de la grille solution : réponses d'une case, ou pays d'une
 * contrainte entière (tap sur un en-tête). Reprend la coque `DrawerContent`
 * de `GuessModal`. Se referme quand `drawer.target` devient `null`
 * (fermeture pilotée par le parent, qui démonte alors ce composant).
 */
export function SolutionDrawer({
  state,
  validAnswers,
  distribution,
  failureRates,
  drawer,
}: Props) {
  const { t, locale } = useLocale();
  const [open, setOpen] = useState(true);
  // Le signalement remplace la liste sur place, avec « ← » pour y revenir.
  const [view, setView] = useState<"answers" | "report">("answers");

  const target = drawer.target;
  const cell = target?.kind === "cell" ? target.cell : null;
  const cellKey = cell ? (`${cell.row},${cell.col}` as CellKey) : null;
  const cellCodes = cellKey ? (validAnswers[cellKey] ?? []) : [];
  const cellDist = cellKey ? distribution?.[cellKey] : undefined;
  const cellFailureRate =
    cellKey && failureRates ? failureRates[CELL_KEYS.indexOf(cellKey)] : null;

  const rowConstraint = cell
    ? CONSTRAINT_BY_ID.get(state.rows[cell.row])
    : undefined;
  const colConstraint = cell
    ? CONSTRAINT_BY_ID.get(state.cols[cell.col])
    : undefined;
  const rowLabel = rowConstraint ? t(rowConstraint.labelKey) : "";
  const colLabel = colConstraint ? t(colConstraint.labelKey) : "";

  const constraintId =
    target?.kind === "constraint" ? target.constraintId : null;
  const constraint = constraintId
    ? CONSTRAINT_BY_ID.get(constraintId)
    : undefined;
  const constraintLabel = constraint ? t(constraint.labelKey) : "";
  const constraintCountries = constraintId
    ? [...constraintAnswers(constraintId)]
    : [];

  // Les valeurs viennent du chunk lazy des faits : les deux contraintes d'une
  // case, ou la contrainte seule d'un en-tête. Jamais appelé conditionnellement.
  const listedCountries = cell ? cellCodes : constraintCountries;
  const valueConstraintIds = cell
    ? [state.rows[cell.row], state.cols[cell.col]]
    : constraintId
      ? [constraintId]
      : [];
  const constraintValues = useConstraintValues(
    listedCountries,
    valueConstraintIds,
  );

  // La case ou la contrainte part avec le signalement : le joueur n'écrit que
  // son texte. Sans cible (tiroir qui se ferme), rien n'est envoyé.
  const reportTarget: ReportTarget = cellKey
    ? { kind: "cell", date: state.date, mode: state.mode, cellKey }
    : constraintId
      ? { kind: "constraint", date: state.date, mode: state.mode, constraintId }
      : { kind: "general", page: "/" };
  const report = useReportSubmit({
    source: cellKey ? "solution_cell" : "solution_constraint",
    mode: state.mode,
    target: reportTarget,
  });

  function openReport() {
    report.trackOpened();
    setView("report");
  }

  function handleClose() {
    setOpen(false);
  }

  if (!target) return null;

  const answersTitle =
    target.kind === "cell" ? `${rowLabel} × ${colLabel}` : constraintLabel;
  const reportSubtitle = t(
    target.kind === "cell" ? "report.contextCell" : "report.contextConstraint",
    {
      target: answersTitle,
      date: formatReportGridDate(state.date, locale),
    },
  );
  const flag = (
    <div className="-mr-1.5 -mt-0.5">
      <ReportFlagButton onClick={openReport} />
    </div>
  );

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        if (!next) handleClose();
      }}
      onOpenChangeComplete={(next) => {
        if (!next) drawer.close();
      }}
    >
      <DrawerContent className="mt-10 flex max-h-[85svh] w-full flex-col overflow-x-clip pb-[env(safe-area-inset-bottom)] sm:mx-auto sm:mt-24 sm:max-w-xl">
        {view === "report" ? (
          <>
            <div className="px-4 pt-3 sm:pt-4">
              <Button
                type="button"
                variant="ghost"
                size="auto"
                onClick={() => setView("answers")}
                className="w-fit gap-1.5 text-xs font-normal"
              >
                <ArrowLeft className="!size-3.5" aria-hidden />
                {t("report.backToAnswers")}
              </Button>
            </div>
            <DrawerHeader className="text-left px-4 pb-2 pt-2">
              <DrawerTitle className="font-serif text-lg font-medium text-on-surface leading-snug">
                {t("report.title")}
              </DrawerTitle>
              <p className="text-xs text-on-surface-variant">
                {reportSubtitle}
              </p>
            </DrawerHeader>
            <div className="overflow-y-auto px-4 pb-6">
              <ReportForm
                initialCategory="content"
                hasGridTarget
                onSubmit={report.submit}
                onDone={handleClose}
              />
            </div>
          </>
        ) : target.kind === "cell" ? (
          <>
            <DrawerHeader className="flex items-start justify-between gap-2 text-left px-4 pb-2 pt-3 sm:pt-4">
              <DrawerTitle className="font-serif text-lg font-medium text-on-surface leading-snug">
                {rowLabel} × {colLabel}
              </DrawerTitle>
              {flag}
            </DrawerHeader>
            {cellKey && cellFailureRate !== null && (
              <CellFailureLine rate={cellFailureRate} />
            )}
            <CellListView
              codes={cellCodes}
              cellDist={cellDist}
              values={constraintValues}
            />
          </>
        ) : (
          <>
            <DrawerHeader className="flex items-start justify-between gap-2 text-left px-4 pb-0 pt-3 sm:pt-4">
              <DrawerTitle className="font-serif text-lg font-medium text-on-surface leading-snug">
                {constraintLabel}
              </DrawerTitle>
              {flag}
            </DrawerHeader>
            <div className="px-4 pb-2">
              {constraintId && (
                <ConstraintSourceInfo constraintId={constraintId} />
              )}
              <p className="mt-2 text-xs text-on-surface-variant">
                {t("ui.constraintAnswerCount", {
                  count: constraintCountries.length,
                })}
              </p>
            </div>
            <ConstraintListView
              countries={constraintCountries}
              values={constraintValues}
            />
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
