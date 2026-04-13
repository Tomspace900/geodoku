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
import { useEffect, useRef, useState } from "react";

const CONSTRAINT_MAP = new Map(CONSTRAINTS.map((c) => [c.id, c]));

const ERROR_LABELS: Record<string, string> = {
  wrong_row: "Ce pays ne correspond pas aux deux contraintes.",
  wrong_col: "Ce pays ne correspond pas aux deux contraintes.",
  wrong_constraints: "Ce pays ne correspond pas aux deux contraintes.",
  already_used: "Ce pays a déjà été utilisé dans une autre cellule.",
  invalid_country: "Pays invalide.",
};

type SubmitResult =
  | { ok: true; rarity: number }
  | { ok: false; reason: string };

type Props = {
  cell: CellPosition;
  state: GameState;
  onClose: () => void;
  onSubmit: (
    cell: CellPosition,
    countryCode: string,
  ) => Promise<SubmitResult | undefined>;
};

export function GuessModal({ cell, state, onClose, onSubmit }: Props) {
  const [open, setOpen] = useState(true);
  const [query, setQuery] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    setErrorMsg(ERROR_LABELS[reason] ?? "Erreur inconnue.");
    errorTimerRef.current = setTimeout(() => setErrorMsg(null), 1200);
  }

  async function handleSelect(countryCode: string) {
    if (submitting) return;
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

  const rowLabel =
    CONSTRAINT_MAP.get(state.rows[cell.row])?.label ?? state.rows[cell.row];
  const colLabel =
    CONSTRAINT_MAP.get(state.cols[cell.col])?.label ?? state.cols[cell.col];

  const results =
    query.length >= 1
      ? searchCountries(query, 12).filter(
          (c) => !state.usedCountries.has(c.code),
        )
      : [];

  return (
    <Drawer
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose();
      }}
    >
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="text-left pb-2 px-4 pt-4">
          <DrawerTitle className="font-serif text-lg font-medium text-on-surface leading-snug">
            {rowLabel} × {colLabel}
          </DrawerTitle>
          <p className="text-[10px] tracking-widest text-on-surface-variant uppercase mt-1">
            Trouvez le pays correspondant
          </p>
        </DrawerHeader>

        {errorMsg && (
          <div className="mx-4 mb-2 px-3 py-2 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
            {errorMsg}
          </div>
        )}

        <Command shouldFilter={false} className="border-none shadow-none">
          <div className="px-4 pb-2">
            <CommandInput
              placeholder="Chercher un pays…"
              value={query}
              onValueChange={setQuery}
              autoFocus
              className="border-0 border-b border-outline-variant/40 rounded-none px-0 focus-visible:ring-0 text-on-surface placeholder:text-on-surface-variant"
            />
          </div>
          <CommandList className="max-h-[50vh] overflow-y-auto px-2 pb-4">
            {query.length < 1 ? (
              <p className="text-center text-sm text-on-surface-variant py-6">
                Saisissez au moins 1 caractère
              </p>
            ) : results.length === 0 ? (
              <CommandEmpty className="text-center text-sm text-on-surface-variant py-6">
                Aucun pays trouvé.
              </CommandEmpty>
            ) : (
              results.map((country) => (
                <CommandItem
                  key={country.code}
                  value={country.code}
                  onSelect={handleSelect}
                  disabled={submitting}
                  className="flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer text-on-surface"
                >
                  <span className="text-xl leading-none">
                    {country.flagEmoji}
                  </span>
                  <span className="text-sm font-medium">
                    {country.nameCanonical}
                  </span>
                </CommandItem>
              ))
            )}
          </CommandList>
        </Command>
      </DrawerContent>
    </Drawer>
  );
}
