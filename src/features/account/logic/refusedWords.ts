// Importé par Convex (via `pseudo.ts`) : imports relatifs seulement.

/**
 * Mots refusés dans un nom de joueur (#155), en minuscules, sans accents :
 * le filtre compare une forme pliée du nom (`pseudo.ts`). Liste de départ, à
 * compléter : le refus ne dit jamais quel mot a gêné (« Ce nom n'est pas
 * possible. Essaie autre chose. »).
 *
 * - `REFUSED_WORDS` : refusés comme mot entier seulement, parce qu'ils sont
 *   courts ou se cachent dans des mots innocents (« con » dans « Condor »).
 * - `REFUSED_SUBSTRINGS` : refusés partout, même collés à d'autres lettres :
 *   des racines assez longues et assez rares pour ne rien attraper d'autre.
 */

/** Noms qui feraient croire à un message de l'équipe du jeu. */
const RESERVED = [
  "geodoku",
  "admin",
  "administrateur",
  "administrator",
  "moderateur",
  "moderator",
  "modo",
  "officiel",
  "official",
  "support",
  "staff",
  "equipe",
  "team",
];

const SHORT_INSULTS = [
  "con",
  "cons",
  "conne",
  "cul",
  "pd",
  "fdp",
  "ntm",
  "tg",
  "nazi",
  "nazis",
  "pute",
  "putes",
  "bite",
  "ass",
  "fag",
  "fags",
  "cunt",
  "dick",
  "cock",
  "slut",
  "whore",
  "twat",
  "rape",
  "pedo",
  // Mots entiers seulement : racines présentes dans des noms innocents
  // (« Dominique », « Montenegro », « Negrete », « Pornic »).
  "nique",
  "niquer",
  "negro",
  "negre",
  "porn",
  "porno",
  "shit",
  "retard",
];

export const REFUSED_WORDS: ReadonlySet<string> = new Set([
  ...RESERVED,
  ...SHORT_INSULTS,
]);

export const REFUSED_SUBSTRINGS: readonly string[] = [
  "connard",
  "connasse",
  "salope",
  "encule",
  "enfoire",
  "batard",
  "pedophil",
  "tafiole",
  "tapette",
  "bougnoul",
  "youpin",
  "bamboula",
  "hitler",
  "fuck",
  "bitch",
  "asshole",
  "bastard",
  "nigga",
  "nigger",
  "faggot",
  "wanker",
  "pussy",
  "penis",
  "vagin",
  "sexe",
  "suicide",
  "terrorist",
];
