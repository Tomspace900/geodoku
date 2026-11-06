import { useId } from "react";
import { Eyebrow } from "@/components/editorial/Eyebrow";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/i18n/LocaleContext";
import type { TKey } from "@/i18n/types";
import { cn } from "@/lib/utils";
import { PSEUDO_MAX_LENGTH } from "../logic/pseudo";
import { pseudoErrorKey } from "../logic/pseudoMessage";
import { DiceButton } from "./DiceButton";

/**
 * Le nom : un champ souligné, comme l'e-mail, en serif italique ; on le
 * touche pour l'écrire. Le dé, à droite, tire un nom que personne n'a.
 */
export function NameField({
  label,
  value,
  onChange,
  onDraw,
  drawing = false,
  serverError = null,
  hideLabel = false,
}: {
  label: string;
  /** Le titre du tiroir dit déjà « Mon nom » : l'étiquette n'est que lue. */
  hideLabel?: boolean;
  value: string;
  onChange: (value: string) => void;
  onDraw: () => void;
  drawing?: boolean;
  /** Refus du serveur, qui reste juge (même règle). */
  serverError?: TKey | null;
}) {
  const { t } = useLocale();
  const id = useId();
  const errorKey = pseudoErrorKey(value) ?? serverError;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className={hideLabel ? "sr-only" : undefined}>
        <Eyebrow as="span">{label}</Eyebrow>
      </label>
      <div className="flex items-end gap-2">
        <Input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          maxLength={PSEUDO_MAX_LENGTH}
          autoComplete="off"
          autoCapitalize="words"
          spellCheck={false}
          aria-invalid={errorKey !== null}
          aria-describedby={errorKey ? `${id}-error` : undefined}
          className={cn(
            "h-12 font-serif text-2xl font-medium italic",
            errorKey && "border-error focus-visible:border-error",
          )}
        />
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
