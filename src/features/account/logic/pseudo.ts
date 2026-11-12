// Importé par Convex (`account.ts`) : imports relatifs seulement.

import { ANIMALS, type NamePart, PLACES } from "./nameParts";
import {
  REFUSED_IL_SUBSTRINGS,
  REFUSED_SUBSTRINGS,
  REFUSED_WORDS,
} from "./refusedWords";

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

/** Chiffres lus comme des lettres (« C0nn4rd », « B1tch », « G30d0ku »). */
const LEET_I: Readonly<Record<string, string>> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "8": "b",
};

/** Même lecture, le 1 lu « l » (« Sa10pe »). */
const LEET_L: Readonly<Record<string, string>> = { ...LEET_I, "1": "l" };

const LEET_READINGS = [LEET_I, LEET_L] as const;

/** Une lettre répétée 3 fois ou plus (« Cuuuul », « Fuuuuck »). */
const STRETCHED = /(.)\1{2,}/g;

// Les racines en une seule expression, compilée une fois : le générateur
// fait passer des dizaines de milliers de noms dans ses tests.
const REFUSED_ROOTS = new RegExp(REFUSED_SUBSTRINGS.join("|"));
const REFUSED_IL_ROOTS = new RegExp(REFUSED_IL_SUBSTRINGS.join("|"));

function stripAccents(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "");
}

function readLeet(text: string, leet: Readonly<Record<string, string>>) {
  return text.replace(/[0134578]/g, (digit) => leet[digit] ?? digit);
}

/**
 * Les mots du nom, pour `REFUSED_WORDS` : coupés aux espaces, tirets,
 * apostrophes (' et ’) et chiffres, et aussi aux majuscules collées
 * (« JeanCul »), avant comme après la lecture des chiffres (« Pute69 »,
 * « P0rn »). Un mot étiré compte aussi réduit à une lettre (« Cuuuul »).
 */
function candidateWords(
  pseudo: string,
  leet: Readonly<Record<string, string>>,
): string[] {
  const unaccented = stripAccents(pseudo);
  const camelSplit = unaccented.replace(/([a-z])([A-Z])/g, "$1 $2");
  const words = [unaccented, camelSplit].flatMap((source) => {
    const lower = source.toLowerCase();
    return [readLeet(lower, leet), lower].flatMap((text) =>
      text.split(/[^a-z]+/).filter(Boolean),
    );
  });
  const unstretched = words
    .filter((word) => /(.)\1{2,}/.test(word))
    .map((word) => word.replace(/(.)\1+/g, "$1"));
  return [...new Set([...words, ...unstretched])];
}

/**
 * Le nom d'un seul tenant, pour les racines : sans accents, chiffres lus,
 * rien que des lettres. Les lettres étirées sont réduites à deux, puis à
 * une (« C000nnard ») ; jamais une répétition de deux seulement, qui ferait
 * de « nigger » le pays « Niger ».
 */
function compactForms(
  pseudo: string,
  leet: Readonly<Record<string, string>>,
): string[] {
  const compact = readLeet(stripAccents(pseudo).toLowerCase(), leet).replace(
    /[^a-z]/g,
    "",
  );
  return [
    ...new Set([
      compact,
      compact.replace(STRETCHED, "$1$1"),
      compact.replace(STRETCHED, "$1"),
    ]),
  ];
}

/**
 * Un mot refusé, entier (« con » n'interdit pas « Condor »), ou une racine
 * assez longue pour ne rien attraper d'innocent, collée ou non aux autres
 * lettres (« X-salope », « s a l o p e »). Les contournements courants sont
 * lus : chiffres pour des lettres, mots collés, lettres étirées, « I »
 * majuscule à la place d'un « l » (« SaIope »).
 */
export function isRefusedPseudo(pseudo: string): boolean {
  return LEET_READINGS.some(
    (leet) =>
      candidateWords(pseudo, leet).some((word) => REFUSED_WORDS.has(word)) ||
      compactForms(pseudo, leet).some(
        (form) =>
          REFUSED_ROOTS.test(form) ||
          REFUSED_IL_ROOTS.test(form.replace(/l/g, "i")),
      ),
  );
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
 * ceux qui tiennent avec l'animal (environ 15 % des paires dépassent en
 * français, moins de 1 % en anglais).
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
