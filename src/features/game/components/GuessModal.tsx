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
import { CONSTRAINTS } from "@/features/game/logic/constraints";
import type { CellPosition, GameState } from "@/features/game/types";
import { useLocale, useT } from "@/i18n/LocaleContext";
import type { TKey } from "@/i18n/types";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

const CONSTRAINT_MAP = new Map(CONSTRAINTS.map((c) => [c.id, c]));

// Maps error reason to i18n key
const ERROR_KEY_MAP: Record<string, TKey> = {
  wrong_row: "error.wrong_row",
  wrong_col: "error.wrong_col",
  wrong_constraints: "error.wrong_constraints",
  already_used: "error.already_used",
  invalid_country: "error.invalid_country",
};

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
    const key = ERROR_KEY_MAP[reason] ?? "error.unknown";
    setErrorMsg(t(key));
    errorTimerRef.current = setTimeout(() => setErrorMsg(null), 1200);
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

  const results = query.length >= 3 ? searchCountries(query, locale, 12) : [];

  return (
    <Drawer
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose();
      }}
    >
      <DrawerContent className="max-h-[90vh] w-full sm:mx-auto sm:max-w-xl">
        <DrawerHeader className="text-left pb-2 px-4 pt-4">
          <DrawerTitle className="font-serif text-lg font-medium text-on-surface leading-snug">
            {rowLabel} × {colLabel}
          </DrawerTitle>
          <p className="text-[10px] tracking-widest text-on-surface-variant uppercase mt-1">
            {t("ui.findMatchingCountry")}
          </p>
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
          <div className="mx-4 mb-2 px-3 py-2 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
            {errorMsg}
          </div>
        )}

        <Command shouldFilter={false} className="border-none shadow-none">
          <div className="px-4 pb-2">
            <CommandInput
              placeholder={t("ui.searchPlaceholder")}
              value={query}
              onValueChange={setQuery}
              autoFocus
              className="border-0 border-b border-outline-variant/40 rounded-none px-0 focus-visible:ring-0 text-on-surface placeholder:text-on-surface-variant"
            />
          </div>
          <CommandList className="max-h-[50vh] overflow-y-auto px-2 pb-4">
            {query.length < 3 ? (
              <p className="text-center text-sm text-on-surface-variant py-6">
                {t("ui.typeAtLeast")}
              </p>
            ) : results.length === 0 ? (
              <CommandEmpty className="text-center text-sm text-on-surface-variant py-6">
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
                      <span className="shrink-0 text-[10px] tracking-widest text-on-surface-variant uppercase">
                        {t("ui.searchResultUsed")}
                      </span>
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
