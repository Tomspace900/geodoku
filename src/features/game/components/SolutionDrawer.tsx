import { ChevronLeft } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { CountrySheet } from "@/features/countries/components/CountrySheet";
import { useCountrySheetData } from "@/features/countries/hooks/useCountrySheetData";
import { getCountryByIso3 } from "@/features/countries/logic/search";
import { ConstraintSourceInfo } from "@/features/game/components/ConstraintSourceInfo";
import type {
  SolutionDrawerView,
  useSolutionDrawer,
} from "@/features/game/hooks/useSolutionDrawer";
import {
  RARITY_STYLES,
  UI_ANIMATION_MS,
} from "@/features/game/logic/constants";
import {
  CONSTRAINT_BY_ID,
  constraintAnswers,
} from "@/features/game/logic/constraints";
import { formatRarityPercent } from "@/features/game/logic/rarity";
import { orderSolutionCountries } from "@/features/game/logic/solutionGridOrder";
import type {
  CellGuessDistribution,
  CellKey,
  GameState,
} from "@/features/game/types";
import { useLocale } from "@/i18n/LocaleContext";
import { focusWithoutVisibleRing } from "@/lib/focus";
import { cn } from "@/lib/utils";

type Props = {
  state: GameState;
  validAnswers: Record<string, string[]>;
  distribution: Record<string, CellGuessDistribution> | undefined;
  drawer: ReturnType<typeof useSolutionDrawer>;
};

/** Réponses d'une case : rareté de la cohorte, ordre du plus rare au plus commun. */
function CellListView({
  codes,
  cellDist,
  userPickIso,
  onSelectCountry,
  rowRefs,
}: {
  codes: readonly string[];
  cellDist: CellGuessDistribution | undefined;
  userPickIso: string | null;
  onSelectCountry: (iso3: string) => void;
  rowRefs: React.MutableRefObject<Map<string, HTMLButtonElement>>;
}) {
  const { locale, t } = useLocale();
  const totalGuesses = cellDist?.totalGuesses ?? 0;
  const rarityByCountry = cellDist?.rarityByCountry ?? {};
  const ordered = orderSolutionCountries(
    [...codes],
    totalGuesses,
    rarityByCountry,
    (a, b) => {
      const na = getCountryByIso3(a)?.names[locale] ?? a;
      const nb = getCountryByIso3(b)?.names[locale] ?? b;
      return na.localeCompare(nb, locale);
    },
  );
  const hasData = totalGuesses > 0;

  return (
    <ul className="flex flex-col gap-1 overflow-y-auto px-4 pb-4">
      {ordered.map(({ iso, tier }) => {
        const country = getCountryByIso3(iso);
        const isUserPick = iso === userPickIso;
        const share = rarityByCountry[iso] ?? 0;
        return (
          <li key={iso}>
            <Button
              type="button"
              variant="ghost"
              size="auto"
              ref={(el) => {
                if (el) rowRefs.current.set(iso, el);
                else rowRefs.current.delete(iso);
              }}
              onClick={() => onSelectCountry(iso)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left",
                isUserPick && "ring-1 ring-inset ring-on-surface/40",
              )}
            >
              <span aria-hidden="true" className="shrink-0 text-base">
                {country?.flagEmoji ?? "🏳️"}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-on-surface">
                {country ? country.names[locale] : iso}
              </span>
              {isUserPick && (
                <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-on-surface-variant">
                  {t("ui.yourPick")}
                </span>
              )}
              {hasData && (
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                    tier ? RARITY_STYLES[tier] : "text-on-surface-variant",
                  )}
                >
                  {formatRarityPercent(share)}
                </span>
              )}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}

/** Tous les pays d'une contrainte (active ou archivée) : nom localisé, sans % ni tier. */
function ConstraintListView({
  countries,
  onSelectCountry,
  rowRefs,
}: {
  countries: readonly string[];
  onSelectCountry: (iso3: string) => void;
  rowRefs: React.MutableRefObject<Map<string, HTMLButtonElement>>;
}) {
  const { locale } = useLocale();
  const ordered = [...countries].sort((a, b) => {
    const na = getCountryByIso3(a)?.names[locale] ?? a;
    const nb = getCountryByIso3(b)?.names[locale] ?? b;
    return na.localeCompare(nb, locale);
  });

  return (
    <ul className="flex flex-col gap-1 overflow-y-auto px-4 pb-4">
      {ordered.map((iso) => {
        const country = getCountryByIso3(iso);
        return (
          <li key={iso}>
            <Button
              type="button"
              variant="ghost"
              size="auto"
              ref={(el) => {
                if (el) rowRefs.current.set(iso, el);
                else rowRefs.current.delete(iso);
              }}
              onClick={() => onSelectCountry(iso)}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left"
            >
              <span aria-hidden="true" className="shrink-0 text-base">
                {country?.flagEmoji ?? "🏳️"}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-on-surface">
                {country ? country.names[locale] : iso}
              </span>
            </Button>
          </li>
        );
      })}
    </ul>
  );
}

function SheetView({
  iso3,
  backButtonRef,
  onBack,
}: {
  iso3: string;
  backButtonRef: React.RefObject<HTMLButtonElement>;
  onBack: () => void;
}) {
  const { locale, t } = useLocale();
  const state = useCountrySheetData(iso3);
  const country = getCountryByIso3(iso3);

  return (
    <div className="flex flex-col gap-3 overflow-y-auto px-4 pb-4">
      <div className="flex items-center gap-2">
        <Button
          ref={backButtonRef}
          type="button"
          variant="ghost"
          size="auto"
          onClick={onBack}
          aria-label={t("ui.backToAnswers")}
          className="shrink-0 rounded-full p-1.5 text-on-surface-variant hover:text-on-surface"
        >
          <ChevronLeft size={18} />
        </Button>
        <DrawerTitle className="min-w-0 truncate font-serif text-lg font-medium text-on-surface">
          {country ? country.names[locale] : iso3}
        </DrawerTitle>
      </div>

      {state.status === "loading" && (
        <div className="flex flex-col gap-3" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-4 w-2/3 animate-pulse rounded bg-surface-low"
            />
          ))}
        </div>
      )}

      {state.status === "error" && (
        <div className="flex flex-col items-start gap-2 py-4">
          <p className="text-sm text-on-surface-variant">
            {t("ui.errorUnknown")}
          </p>
          <Button type="button" variant="secondary" onClick={state.retry}>
            {t("ui.feedbackRetry")}
          </Button>
        </div>
      )}

      {state.status === "ready" && <CountrySheet model={state.data} />}
    </div>
  );
}

/**
 * Drawer de la grille solution : réponses d'une case, ou pays d'une
 * contrainte entière (tap sur un en-tête) → fiche pays, en pile, avec un
 * bouton retour. Reprend la coque `DrawerContent` de `GuessModal`. Se referme
 * quand `drawer.target` devient `null` (fermeture pilotée par le parent, qui
 * démonte alors ce composant).
 */
export function SolutionDrawer({
  state,
  validAnswers,
  distribution,
  drawer,
}: Props) {
  const { locale, t } = useLocale();
  const [open, setOpen] = useState(true);
  const rowRefs = useRef(new Map<string, HTMLButtonElement>());
  const backButtonRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null,
  );
  const previousViewRef = useRef<SolutionDrawerView>(drawer.view);
  const lastOpenedIsoRef = useRef<string | null>(null);

  const target = drawer.target;
  const cell = target?.kind === "cell" ? target.cell : null;
  const cellKey = cell ? (`${cell.row},${cell.col}` as CellKey) : null;
  const cellCodes = cellKey ? (validAnswers[cellKey] ?? []) : [];
  const cellDist = cellKey ? distribution?.[cellKey] : undefined;
  const userCell = cellKey ? state.cells[cellKey] : undefined;
  const userPickIso =
    userCell?.status === "filled" ? userCell.countryCode : null;

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

  function handleClose() {
    setOpen(false);
    setTimeout(drawer.close, UI_ANIMATION_MS.drawerClose);
  }

  // Focus : entrée dans la fiche → bouton retour ; retour à la liste → ligne du pays.
  useEffect(() => {
    if (
      previousViewRef.current.kind === "list" &&
      drawer.view.kind === "sheet"
    ) {
      lastOpenedIsoRef.current = drawer.view.iso3;
      focusWithoutVisibleRing(backButtonRef.current);
    } else if (
      previousViewRef.current.kind === "sheet" &&
      drawer.view.kind === "list" &&
      lastOpenedIsoRef.current
    ) {
      focusWithoutVisibleRing(
        rowRefs.current.get(lastOpenedIsoRef.current) ?? null,
      );
    }
    previousViewRef.current = drawer.view;
  }, [drawer.view]);

  if (!target) return null;

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        if (!next) handleClose();
      }}
    >
      <DrawerContent
        className="mt-10 flex max-h-[85svh] w-full flex-col overflow-x-clip pb-[env(safe-area-inset-bottom)] sm:mx-auto sm:mt-24 sm:max-w-xl"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          focusWithoutVisibleRing(openerRef.current);
        }}
      >
        {drawer.view.kind === "list" ? (
          target.kind === "cell" ? (
            <>
              <DrawerHeader className="text-left px-4 pb-2 pt-3 sm:pt-4">
                <DrawerTitle className="font-serif text-lg font-medium text-on-surface leading-snug">
                  {rowLabel} × {colLabel}
                </DrawerTitle>
              </DrawerHeader>
              <CellListView
                codes={cellCodes}
                cellDist={cellDist}
                userPickIso={userPickIso}
                onSelectCountry={drawer.openCountry}
                rowRefs={rowRefs}
              />
            </>
          ) : (
            <>
              <DrawerHeader className="text-left px-4 pb-0 pt-3 sm:pt-4">
                <DrawerTitle className="font-serif text-lg font-medium text-on-surface leading-snug">
                  {constraintLabel}
                </DrawerTitle>
              </DrawerHeader>
              <div className="px-4 pb-2">
                {constraintId && (
                  <ConstraintSourceInfo
                    constraintId={constraintId}
                    locale={locale}
                    t={t}
                  />
                )}
                <p className="mt-2 text-xs text-on-surface-variant">
                  {t("ui.constraintAnswerCount", {
                    count: constraintCountries.length,
                  })}
                </p>
              </div>
              <ConstraintListView
                countries={constraintCountries}
                onSelectCountry={drawer.openCountry}
                rowRefs={rowRefs}
              />
            </>
          )
        ) : (
          <SheetView
            iso3={drawer.view.iso3}
            backButtonRef={backButtonRef}
            onBack={drawer.backToList}
          />
        )}
      </DrawerContent>
    </Drawer>
  );
}
