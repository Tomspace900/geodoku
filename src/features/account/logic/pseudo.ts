// Importé par Convex (`account.ts`) : imports relatifs seulement.

import { ANIMALS, type NamePart, PLACES } from "./nameParts";
import { REFUSED_SUBSTRINGS, REFUSED_WORDS } from "./refusedWords";

/**
 * Nom de joueur (#155). Le mot « pseudo » reste interne : à l'écran, c'est
 * « Ton nom », « Mon nom ». Tiré par le générateur « Animal + lieu », puis
 * modifiable en texte libre. Règle commune au client (message immédiat) et
 * au serveur (seul juge).
 */

export const PSEUDO_MIN_LENGTH = 3;
export const PSEUDO_MAX_LENGTH = 20;

export type PseudoLocale = "fr" | "en";

export type PseudoVerdict =
  | { ok: true; pseudo: string }
  | { ok: false; reason: "too_short" | "too_long" | "invalid" | "refused" };

/** Lettres (accents compris), chiffres, espaces, tirets et apostrophes. */
const ALLOWED = /^[\p{L}\p{M}\p{Nd} '’-]+$/u;

/** Espaces de bord retirés, espaces répétés réduits à un seul. */
export function normalizePseudo(raw: string): string {
  return raw.normalize("NFC").trim().replace(/\s+/g, " ");
}

/** Longueur en caractères affichés, pas en unités UTF-16. */
export function pseudoLength(pseudo: string): number {
  return [...pseudo].length;
}

const LEET: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
};

/** Forme de comparaison : minuscules, sans accents, chiffres « leet » lus. */
function foldForFilter(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[013457]/g, (digit) => LEET[digit] ?? digit);
}

/**
 * Un mot refusé, entier (« con » n'interdit pas « Condor »), ou une racine
 * assez longue pour ne rien attraper d'innocent, collée ou non aux autres
 * lettres (« X-salope », « s a l o p e »).
 */
export function isRefusedPseudo(pseudo: string): boolean {
  const folded = foldForFilter(pseudo);
  const words = folded.split(/[\s'’-]+/).filter(Boolean);
  if (words.some((word) => REFUSED_WORDS.has(word))) return true;
  const compact = folded.replace(/[^a-z]/g, "");
  return REFUSED_SUBSTRINGS.some((root) => compact.includes(root));
}

export function checkPseudo(raw: string): PseudoVerdict {
  const pseudo = normalizePseudo(raw);
  const length = pseudoLength(pseudo);
  if (length < PSEUDO_MIN_LENGTH) return { ok: false, reason: "too_short" };
  if (length > PSEUDO_MAX_LENGTH) return { ok: false, reason: "too_long" };
  if (!ALLOWED.test(pseudo)) return { ok: false, reason: "invalid" };
  if (isRefusedPseudo(pseudo)) return { ok: false, reason: "refused" };
  return { ok: true, pseudo };
}

export function composePseudo(
  animal: NamePart,
  place: NamePart,
  locale: PseudoLocale,
): string {
  return locale === "fr"
    ? `${animal.fr} ${place.fr}`
    : `${place.en} ${animal.en}`;
}

function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length) % items.length];
}

/**
 * Un nom tiré au hasard, de 20 caractères au plus : le lieu est tiré parmi
 * ceux qui tiennent avec l'animal (environ 2 % des paires dépassent en
 * français, aucune en anglais).
 */
export function drawPseudo(
  locale: PseudoLocale,
  random: () => number = Math.random,
): string {
  const animal = pick(ANIMALS, random);
  const fitting = PLACES.filter(
    (place) =>
      pseudoLength(composePseudo(animal, place, locale)) <= PSEUDO_MAX_LENGTH,
  );
  return composePseudo(animal, pick(fitting, random), locale);
}
