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
import { searchCountries } from "@/features/countries/lib/search";
import { RARITY_STYLES } from "@/features/game/logic/constants";
import { CONSTRAINTS } from "@/features/game/logic/constraints";
import {
  type ConstraintFailureReason,
  isConstraintFailureReason,
} from "@/features/game/logic/validation";
import type { CellPosition, GameState } from "@/features/game/types";
import { useLocale, useT } from "@/i18n/LocaleContext";
import type { TKey } from "@/i18n/types";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

const CONSTRAINT_MAP = new Map(CONSTRAINTS.map((c) => [c.id, c]));

const ERROR_KEY_MAP: Record<string, TKey> = {
  already_used: "error.already_used",
  invalid_country: "error.invalid_country",
};

const ERROR_FEEDBACK_MS = 1500;
const FAILED_CONSTRAINT_CLASS = cn(
  RARITY_STYLES.ultra,
  "rounded-md px-1.5 py-0.5",
);

type SubmitResult =
  | { ok: true; rarity: number }
  | { ok: false; reason: string };

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
  const [open, setOpen] = useState(true);
  const [query, setQuery] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [errorReason, setErrorReason] =
    useState<ConstraintFailureReason | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { locale } = useLocale();
  const t = useT();

  useEffect(() => {
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, []);

  function handleClose() {
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
    }, ERROR_FEEDBACK_MS);
  }

  async function handleSelect(countryCode: string) {
    if (submitting || state.usedCountries.has(countryCode)) return;
    setSubmitting(true);
    const result = await onSubmit(cell, countryCode);
    setSubmitting(false);
    if (result?.ok) {
      handleClose();
    } else if (result) {
      setQuery("");
      showError(result.reason);
    }
  }

  const rowConstraint = CONSTRAINT_MAP.get(state.rows[cell.row]);
  const colConstraint = CONSTRAINT_MAP.get(state.cols[cell.col]);
  const rowLabel = rowConstraint
    ? t(rowConstraint.labelKey)
    : state.rows[cell.row];
  const colLabel = colConstraint
    ? t(colConstraint.labelKey)
    : state.cols[cell.col];

  const cellKey = `${cell.row},${cell.col}`;
  const codesForCell = validAnswers[cellKey] ?? [];
  const totalPossible = codesForCell.length;
  const remainingPossible = codesForCell.filter(
    (code) => !state.usedCountries.has(code),
  ).length;

  const hasMinSearchLength = query.length >= 3;
  const results = hasMinSearchLength ? searchCountries(query, locale, 12) : [];

  const rowFailed =
    errorReason === "wrong_row" || errorReason === "wrong_constraints";
  const colFailed =
    errorReason === "wrong_col" || errorReason === "wrong_constraints";

  return (
    <Drawer
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose();
      }}
    >
      <DrawerContent className="mt-10 max-h-[94svh] w-full overflow-x-hidden pb-[env(safe-area-inset-bottom)] sm:mx-auto sm:mt-24 sm:max-w-xl">
        <DrawerHeader className="text-left px-4 pb-2 pt-3 sm:pt-4">
          <DrawerTitle className="font-serif text-lg font-medium text-on-surface leading-snug">
            <span className={cn(rowFailed && FAILED_CONSTRAINT_CLASS)}>
              {rowLabel}
            </span>
            {" × "}
            <span className={cn(colFailed && FAILED_CONSTRAINT_CLASS)}>
              {colLabel}
            </span>
          </DrawerTitle>
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

        {errorMsg && (
          <div className="mx-4 mb-2 px-3 py-2 bg-error/10 text-error text-sm rounded-lg">
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
                const alreadyUsed = state.usedCountries.has(country.code);
                return (
                  <CommandItem
                    key={country.code}
                    value={country.code}
                    onSelect={() => {
                      void handleSelect(country.code);
                    }}
                    disabled={submitting || alreadyUsed}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer text-on-surface",
                      alreadyUsed && "text-on-surface-variant",
                    )}
                  >
                    <span
                      className={cn(
                        "text-xl leading-none",
                        alreadyUsed && "opacity-70",
                      )}
                    >
                      {country.flagEmoji}
                    </span>
                    <span className="min-w-0 flex-1 text-sm font-medium truncate">
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
