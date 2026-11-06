import type { TKey } from "@/i18n/types";
import { checkPseudo, type PseudoVerdict } from "./pseudo";

const REFUSAL_KEYS = {
  too_short: "account.nameTooShort",
  too_long: "account.nameTooLong",
  invalid: "account.nameInvalid",
  refused: "account.nameRefused",
} as const satisfies Record<
  Extract<PseudoVerdict, { ok: false }>["reason"],
  TKey
>;

export type PseudoRefusal = keyof typeof REFUSAL_KEYS;

export function refusalKey(reason: PseudoRefusal): TKey {
  return REFUSAL_KEYS[reason];
}

/** Message d'un nom refusé, sans jamais dire le mot qui a gêné. */
export function pseudoErrorKey(value: string): TKey | null {
  const verdict = checkPseudo(value);
  return verdict.ok ? null : REFUSAL_KEYS[verdict.reason];
}
