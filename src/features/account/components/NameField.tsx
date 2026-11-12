import { useEffect, useId, useRef, useState } from "react";
import { Eyebrow } from "@/components/editorial/Eyebrow";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/i18n/LocaleContext";
import type { TKey } from "@/i18n/types";
import { cn } from "@/lib/utils";
import { useBounce } from "../hooks/useBounce";
import { PSEUDO_MAX_LENGTH } from "../logic/pseudo";
import { pseudoErrorKey } from "../logic/pseudoMessage";
import { DiceButton } from "./DiceButton";

/** Le texte du nom, partagé par le champ et la copie qui rebondit. */
const NAME_TEXT = "font-serif text-2xl font-medium italic";

/**
 * Le nom : un champ souligné, comme l'e-mail, en serif italique ; on le
 * touche pour l'écrire. Le dé, à droite, tire un nom que personne n'a.
 */
export function NameField({
  label,
  value,
  onChange,
  onDraw,
  onCommit,
  drawing = false,
  serverError = null,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onDraw: () => void;
  /**
   * « Mon compte » n'a pas de bouton « Enregistrer » : le nom part en quittant
   * le champ (ou à Entrée, qui ferme aussi le clavier).
   */
  onCommit?: () => void;
  drawing?: boolean;
  /** Refus du serveur, qui reste juge (même règle). */
  serverError?: TKey | null;
}) {
  const { t } = useLocale();
  const id = useId();
  const errorKey = pseudoErrorKey(value) ?? serverError;
  // Un tirage abouti (fin de `drawing` avec un nom nouveau) fait rebondir le nom.
  const [drawn, setDrawn] = useState(0);
  const drawStart = useRef<string | null>(null);
  useEffect(() => {
    if (drawing) {
      drawStart.current = value;
      return;
    }
    if (drawStart.current !== null && drawStart.current !== value) {
      setDrawn((count) => count + 1);
    }
    drawStart.current = null;
  }, [drawing, value]);
  const bouncing = useBounce(drawn);
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id}>
        <Eyebrow as="span">{label}</Eyebrow>
      </label>
      <div className="flex items-end gap-2">
        {/* Un champ n'anime pas son texte seul : pendant le rebond, le texte du
            champ s'efface sous une copie qui rebondit, sans le trait. */}
        <div className="relative min-w-0 flex-1">
          <Input
            id={id}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onBlur={onCommit}
            onKeyDown={(event) => {
              if (event.key === "Enter" && onCommit) {
                event.preventDefault();
                event.currentTarget.blur();
              }
            }}
            enterKeyHint={onCommit ? "done" : undefined}
            maxLength={PSEUDO_MAX_LENGTH}
            autoComplete="off"
            autoCapitalize="words"
            spellCheck={false}
            aria-invalid={errorKey !== null}
            aria-describedby={errorKey ? `${id}-error` : undefined}
            className={cn(
              NAME_TEXT,
              "h-12",
              errorKey && "border-error focus-visible:border-error",
              bouncing && "text-transparent",
            )}
          />
          {bouncing && (
            <span
              aria-hidden
              className={cn(
                NAME_TEXT,
                "pointer-events-none absolute inset-y-0 left-0 flex items-center whitespace-pre text-on-surface animate-name-bounce",
              )}
            >
              {value}
            </span>
          )}
        </div>
        <DiceButton
          label={t("account.drawName")}
          onClick={onDraw}
          disabled={drawing}
        />
      </div>
      {errorKey && (
        <p id={`${id}-error`} className="pt-1 text-xs text-error">
          {t(errorKey)}
        </p>
      )}
    </div>
  );
}
