import { type ReactNode, useId } from "react";
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
const NAME_TEXT = {
  field: "font-serif text-2xl font-medium italic",
  title: "font-serif text-3xl font-medium italic leading-none",
} as const;

/**
 * Le nom : un champ souligné, comme l'e-mail, en serif italique ; on le
 * touche pour l'écrire. Le dé, à droite, tire un nom que personne n'a. En
 * titre de « Mes stats » (`variant="title"`), le même champ prend la taille
 * du titre, sans étiquette visible, le drapeau devant.
 */
export function NameField({
  label,
  value,
  onChange,
  onDraw,
  onCommit,
  onCancel,
  drawing = false,
  drawCount = 0,
  serverError = null,
  variant = "field",
  leading,
  autoFocus = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onDraw: () => void;
  /**
   * Pas de bouton « Enregistrer » dans « Mon compte » ni dans le titre : le
   * nom part en quittant le champ, ou à Entrée (qui ferme aussi le clavier).
   */
  onCommit?: () => void;
  /** Échap : on abandonne ce qui est écrit. */
  onCancel?: () => void;
  drawing?: boolean;
  /** Avance à chaque nom tiré : le nom rebondit, jamais un nom tapé. */
  drawCount?: number;
  /** Refus du serveur, qui reste juge (même règle). */
  serverError?: TKey | null;
  variant?: "field" | "title";
  /** Devant le champ, sur la même ligne (le drapeau du titre). */
  leading?: ReactNode;
  autoFocus?: boolean;
}) {
  const { t } = useLocale();
  const id = useId();
  const errorKey = pseudoErrorKey(value) ?? serverError;
  const bounce = useBounce(drawCount);
  const text = NAME_TEXT[variant];
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className={variant === "title" ? "sr-only" : undefined}
      >
        <Eyebrow as="span">{label}</Eyebrow>
      </label>
      <div
        className={cn(
          "flex gap-2",
          variant === "title" ? "items-center" : "items-end",
        )}
      >
        {leading}
        {/* Un champ n'anime pas son texte seul : pendant le rebond, le texte du
            champ s'efface sous une copie qui rebondit, sans le trait. */}
        <div className="relative min-w-0 flex-1">
          <Input
            id={id}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onBlur={variant === "field" ? onCommit : undefined}
            onKeyDown={(event) => {
              if (event.key === "Enter" && onCommit) {
                event.preventDefault();
                if (variant === "field") event.currentTarget.blur();
                else onCommit();
              }
              if (event.key === "Escape" && onCancel) {
                event.preventDefault();
                onCancel();
              }
            }}
            enterKeyHint={onCommit ? "done" : undefined}
            maxLength={PSEUDO_MAX_LENGTH}
            autoComplete="off"
            autoCapitalize="words"
            spellCheck={false}
            autoFocus={autoFocus}
            aria-invalid={errorKey !== null}
            aria-describedby={errorKey ? `${id}-error` : undefined}
            className={cn(
              text,
              variant === "field" ? "h-12" : "h-11",
              errorKey && "border-error focus-visible:border-error",
              bounce.bouncing && "text-transparent",
            )}
          />
          {bounce.bouncing && (
            <span
              key={bounce.key}
              aria-hidden
              className={cn(
                text,
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
