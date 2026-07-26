import { Eyebrow } from "@/components/editorial/Eyebrow";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { searchCountries } from "@/features/countries/logic/search";
import { UI_ANIMATION_MS } from "@/features/game/logic/constants";
import { CONSTRAINT_BY_ID } from "@/features/game/logic/constraints";
import { getUsedCountryCodes } from "@/features/game/logic/usedCountries";
import {
  type ConstraintFailureReason,
  isConstraintFailureReason,
} from "@/features/game/logic/validation";
import type {
  CellPosition,
  GameState,
  LivesState,
} from "@/features/game/types";
import { useLocale, useT } from "@/i18n/LocaleContext";
import type { TKey } from "@/i18n/types";
import { focusWithoutVisibleRing } from "@/lib/focus";
import { cn } from "@/lib/utils";
import { usePostHog } from "@posthog/react";
import { Heart, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const ERROR_KEY_MAP: Record<string, TKey> = {
  already_used: "error.already_used",
  invalid_country: "error.invalid_country",
  unavailable: "error.unavailable",
};

const FAILED_CONSTRAINT_CLASS =
  "rounded-md bg-error/10 px-1.5 py-0.5 text-error";

type SubmitResult =
  | { kind: "accepted" }
  | { kind: "domain_rejected"; reason: string; gameOver: boolean }
  | { kind: "unavailable" };

type LifeFlash = {
  key: number;
  /** Valeur du compteur avant le coup raté (vies restantes, ou essais ratés). */
  from: number;
  phase: "shake" | "empty";
};

type LivesIndicatorProps = {
  lives: LivesState;
  lifeFlash: LifeFlash | null;
};

/**
 * Compteur de la modale de saisie, avec sa séquence d'animation (sursaut puis
 * bascule du chiffre). Le régime limité décompte vers le bas et vide un cœur ;
 * l'entraînement compte vers le haut, sur une croix rouge.
 */
function LivesIndicator({ lives, lifeFlash }: LivesIndicatorProps) {
  const t = useT();
  const unlimited = lives.kind === "unlimited";
  const settled = unlimited ? lives.failedAttempts : lives.remaining;
  // Pendant le sursaut on montre encore la valeur d'avant ; à la bascule, celle d'après.
  const displayed = lifeFlash
    ? lifeFlash.phase === "shake"
      ? lifeFlash.from
      : lifeFlash.from + (unlimited ? 1 : -1)
    : settled;
  const heartFilled = lifeFlash ? lifeFlash.phase === "shake" : settled > 0;

  return (
    <div className="mt-0.5 shrink-0">
      <output aria-live="assertive" aria-atomic="true" className="sr-only">
        {unlimited
          ? t("training.attempts", { count: settled })
          : t("ui.remainingLives", { count: settled })}
      </output>
      <div
        key={lifeFlash?.key ?? "lives-idle"}
        className={cn(
          "flex origin-center items-center gap-1",
          lifeFlash?.phase === "shake" && "animate-heart-shake",
        )}
        aria-hidden="true"
      >
        <span
          key={
            lifeFlash?.phase === "empty"
              ? `lives-down-${lifeFlash.key}`
              : "lives-steady"
          }
          className={cn(
            "text-sm font-semibold tabular-nums text-on-surface",
            lifeFlash?.phase === "empty" && "animate-lives-tick",
          )}
        >
          {displayed}
        </span>
        {unlimited ? (
          <X size={18} className="text-error" />
        ) : (
          <Heart
            size={18}
            className={
              heartFilled ? "text-error fill-error" : "text-on-surface-variant"
            }
          />
        )}
      </div>
    </div>
  );
}

type Props = {
  cell: CellPosition;
  state: GameState;
  /** ISO3 listes par case (`"row,col"`), aligné sur la grille du jour */
  validAnswers: Record<string, string[]>;
  onClose: () => void;
  onSubmit: (
    cell: CellPosition,
    countryCode: string,
  ) => Promise<SubmitResult | undefined>;
};

export function GuessModal({
  cell,
  state,
  validAnswers,
  onClose,
  onSubmit,
}: Props) {
  const posthog = usePostHog();
  const [open, setOpen] = useState(true);
  const [query, setQuery] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [errorReason, setErrorReason] =
    useState<ConstraintFailureReason | null>(null);
  const [lifeFlash, setLifeFlash] = useState<LifeFlash | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lifeFlashTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const openerRef = useRef<HTMLElement | null>(
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null,
  );
  const { locale } = useLocale();
  const t = useT();

  function triggerLifeLoss(from: number) {
    for (const timer of lifeFlashTimersRef.current) clearTimeout(timer);
    lifeFlashTimersRef.current = [];
    const key = Date.now();
    setLifeFlash({ key, from, phase: "shake" });
    lifeFlashTimersRef.current.push(
      setTimeout(() => {
        setLifeFlash((flash) =>
          flash?.key === key ? { ...flash, phase: "empty" } : flash,
        );
      }, UI_ANIMATION_MS.heartBreak),
      setTimeout(() => {
        setLifeFlash((flash) => (flash?.key === key ? null : flash));
      }, UI_ANIMATION_MS.errorFeedback),
    );
  }

  useEffect(() => {
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      for (const timer of lifeFlashTimersRef.current) clearTimeout(timer);
      lifeFlashTimersRef.current = [];
    };
  }, []);

  function handleClose(reason: "submitted" | "dismissed") {
    if (reason === "dismissed") {
      posthog?.capture("guess_modal_closed", {
        grid_date: state.date,
        cell: cellKey,
        had_query: query.length > 0,
        query_length: query.length,
      });
    }
    setOpen(false);
    setTimeout(onClose, 300);
  }

  function showError(reason: string) {
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    const isConstraintError = isConstraintFailureReason(reason);
    setErrorReason(isConstraintError ? reason : null);
    setErrorMsg(
      isConstraintError ? null : t(ERROR_KEY_MAP[reason] ?? "error.unknown"),
    );
    errorTimerRef.current = setTimeout(() => {
      setErrorMsg(null);
      setErrorReason(null);
    }, UI_ANIMATION_MS.errorFeedback);
  }

  async function handleSelect(countryCode: string) {
    if (submitting || usedCountryCodes.has(countryCode)) return;
    const counterBeforeSubmit =
      state.lives.kind === "unlimited"
        ? state.lives.failedAttempts
        : state.lives.remaining;
    setSubmitting(true);
    const result = await onSubmit(cell, countryCode);
    setSubmitting(false);
    if (!result) return;
    if (result.kind === "accepted") {
      handleClose("submitted");
      return;
    }
    if (result.kind === "unavailable") {
      showError("unavailable");
      return;
    }
    if (result.gameOver) {
      handleClose("submitted");
      return;
    }
    setQuery("");
    showError(result.reason);
    triggerLifeLoss(counterBeforeSubmit);
  }

  const rowConstraint = CONSTRAINT_BY_ID.get(state.rows[cell.row]);
  const colConstraint = CONSTRAINT_BY_ID.get(state.cols[cell.col]);
  const rowLabel = rowConstraint
    ? t(rowConstraint.labelKey)
    : state.rows[cell.row];
  const colLabel = colConstraint
    ? t(colConstraint.labelKey)
    : state.cols[cell.col];

  const cellKey = `${cell.row},${cell.col}`;
  const usedCountryCodes = getUsedCountryCodes(state.cells);
  const codesForCell = validAnswers[cellKey] ?? [];
  const totalPossible = codesForCell.length;
  const remainingPossible = codesForCell.filter(
    (code) => !usedCountryCodes.has(code),
  ).length;

  const hasMinSearchLength = query.length >= 3;
  const results = hasMinSearchLength ? searchCountries(query, 12) : [];

  const rowFailed =
    errorReason === "wrong_row" || errorReason === "wrong_constraints";
  const colFailed =
    errorReason === "wrong_col" || errorReason === "wrong_constraints";
  const constraintErrorMessage =
    errorReason === "wrong_row"
      ? t("error.wrong_row", { constraint: rowLabel })
      : errorReason === "wrong_col"
        ? t("error.wrong_col", { constraint: colLabel })
        : errorReason === "wrong_constraints"
          ? t("error.wrong_constraints", {
              rowConstraint: rowLabel,
              colConstraint: colLabel,
            })
          : null;

  return (
    <Drawer
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose("dismissed");
      }}
    >
      <DrawerContent
        className="mt-10 max-h-[94svh] w-full overflow-x-hidden pb-[env(safe-area-inset-bottom)] sm:mx-auto sm:mt-24 sm:max-w-xl"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          focusWithoutVisibleRing(openerRef.current);
        }}
      >
        <DrawerHeader className="text-left px-4 pb-2 pt-3 sm:pt-4">
          <div className="flex items-start justify-between gap-3">
            <DrawerTitle className="min-w-0 font-serif text-lg font-medium text-on-surface leading-snug">
              <span className={cn(rowFailed && FAILED_CONSTRAINT_CLASS)}>
                {rowLabel}
              </span>
              {" × "}
              <span className={cn(colFailed && FAILED_CONSTRAINT_CLASS)}>
                {colLabel}
              </span>
            </DrawerTitle>
            <LivesIndicator lives={state.lives} lifeFlash={lifeFlash} />
          </div>
          {totalPossible > 0 && (
            <p className="text-xs text-on-surface-variant mt-2">
              {remainingPossible === totalPossible
                ? t("ui.possibleAnswersCount", { count: totalPossible })
                : t("ui.possibleAnswersPartial", {
                    remaining: remainingPossible,
                    total: totalPossible,
                  })}
            </p>
          )}
        </DrawerHeader>

        {constraintErrorMessage && (
          <p role="alert" className="sr-only">
            {constraintErrorMessage}
          </p>
        )}

        {errorMsg && (
          <div
            role="alert"
            className="mx-4 mb-2 rounded-lg bg-error/10 px-3 py-2 text-sm text-error"
          >
            {errorMsg}
          </div>
        )}

        <Command shouldFilter={false} className="border-none shadow-none">
          <div className="px-4 pb-2">
            <CommandInput
              autoFocus
              placeholder={t("ui.searchPlaceholder")}
              value={query}
              onValueChange={setQuery}
              name="country-search"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              inputMode="search"
              enterKeyHint="search"
              className="rounded-none px-0 focus-visible:ring-0 text-on-surface placeholder:text-on-surface-variant"
            />
          </div>
          <CommandList
            className={cn(
              "overflow-y-auto px-2 pb-4 overscroll-contain",
              hasMinSearchLength &&
                "max-h-[calc(100dvh-11rem)] sm:max-h-[min(58vh,calc(100dvh-15rem))]",
            )}
          >
            {!hasMinSearchLength ? (
              <p className="py-2 text-center text-sm text-on-surface-variant sm:py-6">
                {t("ui.typeAtLeast")}
              </p>
            ) : results.length === 0 ? (
              <CommandEmpty className="py-3 text-center text-sm text-on-surface-variant sm:py-6">
                {t("ui.noResults")}
              </CommandEmpty>
            ) : (
              results.map((country) => {
                const alreadyUsed = usedCountryCodes.has(country.iso3);
                return (
                  <CommandItem
                    key={country.iso3}
                    value={country.iso3}
                    onSelect={() => {
                      void handleSelect(country.iso3);
                    }}
                    disabled={submitting || alreadyUsed}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer text-on-surface",
                      alreadyUsed && "text-on-surface-variant",
                    )}
                  >
                    <span className="pl-3 min-w-0 flex-1 text-sm font-medium truncate">
                      {country.names[locale]}
                    </span>
                    {alreadyUsed && (
                      <Eyebrow as="span" className="shrink-0">
                        {t("ui.searchResultUsed")}
                      </Eyebrow>
                    )}
                  </CommandItem>
                );
              })
            )}
          </CommandList>
        </Command>
      </DrawerContent>
    </Drawer>
  );
}
