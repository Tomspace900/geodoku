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
import type {
  SolutionCellDrawerView,
  useSolutionCellDrawer,
} from "@/features/game/hooks/useSolutionCellDrawer";
import { RARITY_STYLES } from "@/features/game/logic/constants";
import { CONSTRAINT_BY_ID } from "@/features/game/logic/constraints";
import {
  formatRarityPercent,
  isCohortComplete,
} from "@/features/game/logic/rarity";
import { orderSolutionCountries } from "@/features/game/logic/solutionGridOrder";
import type {
  CellGuessDistribution,
  CellKey,
  GameState,
} from "@/features/game/types";
import { useLocale, useT } from "@/i18n/LocaleContext";
import { focusWithoutVisibleRing } from "@/lib/focus";
import { cn } from "@/lib/utils";

type Props = {
  state: GameState;
  validAnswers: Record<string, string[]>;
  distribution: Record<string, CellGuessDistribution> | undefined;
  drawer: ReturnType<typeof useSolutionCellDrawer>;
};

function ListView({
  codes,
  cellDist,
  cohortComplete,
  userPickIso,
  onSelectCountry,
  rowRefs,
}: {
  codes: readonly string[];
  cellDist: CellGuessDistribution | undefined;
  cohortComplete: boolean;
  userPickIso: string | null;
  onSelectCountry: (iso3: string) => void;
  rowRefs: React.MutableRefObject<Map<string, HTMLButtonElement>>;
}) {
  const { locale, t } = useLocale();
  const ordered = orderSolutionCountries(
    codes,
    cellDist,
    cohortComplete,
    (a, b) => {
      const na = getCountryByIso3(a)?.names[locale] ?? a;
      const nb = getCountryByIso3(b)?.names[locale] ?? b;
      return na.localeCompare(nb, locale);
    },
  );
  const hasData = cellDist !== undefined;

  return (
    <ul className="flex flex-col gap-1 overflow-y-auto px-4 pb-4">
      {ordered.map(({ iso, tier }) => {
        const country = getCountryByIso3(iso);
        const isUserPick = iso === userPickIso;
        const share = cellDist?.rarityByCountry[iso];
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
              {hasData && share !== undefined && (
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
        <h3 className="min-w-0 truncate font-serif text-lg font-medium text-on-surface">
          {country ? country.names[locale] : iso3}
        </h3>
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
 * Drawer des réponses d'une case solution : liste ordonnée → fiche pays, en
 * pile, avec un bouton retour. Reprend la coque `DrawerContent` de
 * `GuessModal`. Se referme quand `drawer.openCell` devient `null` (fermeture
 * pilotée par le parent, qui démonte alors ce composant).
 */
export function SolutionCellDrawer({
  state,
  validAnswers,
  distribution,
  drawer,
}: Props) {
  const t = useT();
  const [open, setOpen] = useState(true);
  const rowRefs = useRef(new Map<string, HTMLButtonElement>());
  const backButtonRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null,
  );
  const previousViewRef = useRef<SolutionCellDrawerView>(drawer.view);
  const lastOpenedIsoRef = useRef<string | null>(null);

  const cell = drawer.openCell;
  const cellKey = cell ? (`${cell.row},${cell.col}` as CellKey) : null;
  const codes = cellKey ? (validAnswers[cellKey] ?? []) : [];
  const cellDist = cellKey ? distribution?.[cellKey] : undefined;
  const userCell = cellKey ? state.cells[cellKey] : undefined;
  const userPickIso =
    userCell?.status === "filled" ? userCell.countryCode : null;
  const cohortComplete = isCohortComplete(state.mode);

  const rowConstraint = cell
    ? CONSTRAINT_BY_ID.get(state.rows[cell.row])
    : undefined;
  const colConstraint = cell
    ? CONSTRAINT_BY_ID.get(state.cols[cell.col])
    : undefined;
  const rowLabel = rowConstraint ? t(rowConstraint.labelKey) : "";
  const colLabel = colConstraint ? t(colConstraint.labelKey) : "";

  function handleClose() {
    setOpen(false);
    setTimeout(drawer.close, 300);
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

  if (!cell) return null;

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        if (!next) handleClose();
      }}
    >
      <DrawerContent
        className="mt-10 max-h-[85svh] w-full overflow-x-hidden pb-[env(safe-area-inset-bottom)] sm:mx-auto sm:mt-24 sm:max-w-xl"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          focusWithoutVisibleRing(openerRef.current);
        }}
      >
        {drawer.view.kind === "list" ? (
          <>
            <DrawerHeader className="text-left px-4 pb-2 pt-3 sm:pt-4">
              <DrawerTitle className="font-serif text-lg font-medium text-on-surface leading-snug">
                {rowLabel} × {colLabel}
              </DrawerTitle>
            </DrawerHeader>
            <ListView
              codes={codes}
              cellDist={cellDist}
              cohortComplete={cohortComplete}
              userPickIso={userPickIso}
              onSelectCountry={drawer.openCountry}
              rowRefs={rowRefs}
            />
          </>
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
