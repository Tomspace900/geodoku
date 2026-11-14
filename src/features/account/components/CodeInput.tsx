import { Fragment, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export const CODE_LENGTH = 6;
const CELL_IDS = ["d1", "d2", "d3", "d4", "d5", "d6"] as const;

type Props = {
  value: string;
  onChange: (value: string) => void;
  /** Le 6ᵉ chiffre posé : le code part tout seul. */
  onComplete: (code: string) => void;
  tone: "idle" | "error" | "dead";
  label: string;
  disabled?: boolean;
  /** Change à chaque erreur : rejoue la secousse. */
  shakeKey?: number;
  autoFocus?: boolean;
};

/**
 * Six cases, 3 + 3, comme une mini-grille. Un seul vrai champ, transparent,
 * par-dessus : la suggestion du code par le clavier (`one-time-code`) et le
 * collage remplissent les six cases d'un coup.
 */
export function CodeInput({
  value,
  onChange,
  onComplete,
  tone,
  label,
  disabled = false,
  shakeKey = 0,
  autoFocus = false,
}: Props) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mauvais code : le champ reprend la main, chiffres sélectionnés, pour
  // qu'on retape par-dessus sans les effacer un à un. Chaque erreur compte,
  // même deux d'affilée (`shakeKey`).
  // biome-ignore lint/correctness/useExhaustiveDependencies: shakeKey relance l'effet à chaque erreur
  useEffect(() => {
    if (tone !== "error") return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [tone, shakeKey]);

  function change(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, CODE_LENGTH);
    onChange(digits);
    if (digits.length === CODE_LENGTH) onComplete(digits);
  }

  return (
    <div
      key={shakeKey}
      className={cn("relative", tone === "error" && "animate-heart-shake")}
    >
      <div className="flex items-center justify-center gap-1.5" aria-hidden>
        {CELL_IDS.map((id, i) => {
          const digit = value[i];
          const caret =
            focused &&
            tone === "idle" &&
            i === Math.min(value.length, CODE_LENGTH - 1);
          return (
            <Fragment key={id}>
              {i === CODE_LENGTH / 2 && <span className="w-1.5" />}
              <div
                className={cn(
                  "grid h-14 w-11 place-items-center rounded-xl font-serif text-3xl font-medium tabular-nums text-on-surface",
                  digit
                    ? "bg-surface-lowest ring-1 ring-inset ring-outline-variant/15"
                    : "bg-surface-low",
                  caret && "ring-2 ring-inset ring-on-surface/40",
                  tone === "error" && "bg-error/10 text-error ring-0",
                  tone === "dead" && "text-on-surface-variant/50",
                )}
              >
                {digit ?? ""}
              </div>
            </Fragment>
          );
        })}
      </div>
      <input
        ref={inputRef}
        value={value}
        onChange={(event) => change(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={CODE_LENGTH}
        // biome-ignore lint/a11y/noAutofocus: l'étape n'existe que pour taper ce code
        autoFocus={autoFocus}
        disabled={disabled}
        aria-label={label}
        // Champ quasi invisible sur les cases : texte et curseur sont dessinés
        // par les cases. 16 px pour qu'iOS ne zoome pas ; pas tout à fait
        // transparent, sinon iOS peut taire la suggestion du code.
        className="absolute inset-0 h-full w-full cursor-text bg-transparent text-base text-transparent caret-transparent opacity-[0.01] outline-none"
      />
    </div>
  );
}
