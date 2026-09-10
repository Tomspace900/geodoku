/**
 * Garde de cohérence du dataset de souveraineté
 * (`scripts/countries/data/sovereignty.ts`).
 *
 * Le champ *Independence* du Factbook est du texte libre, et `formerSovereigns`
 * en est une lecture **à la main**. Deux revues successives ont montré que cette
 * lecture se fait à l'œil et rate des cas : la revue du 2026-09-09 a complété
 * USA, PAK et CAN puis conclu « trou rattrapé », alors qu'il restait le Soudan
 * (« from Egypt and the UK ») et Nauru (« UK-administered UN trusteeship »),
 * trouvés à la revue métier du 2026-09-10.
 *
 * D'où cette garde : si une `sourceDescription` **nomme** une des puissances
 * tracées et que `formerSovereigns` ne la contient pas, il faut soit compléter la
 * curation, soit inscrire le cas dans `ACCEPTED_OMISSIONS` avec son motif. Un
 * faux négatif d'histoire coûte une vie au joueur qui a raison : c'est le pire
 * défaut possible d'une liste de réponses.
 *
 * La garde ne contrôle **pas** l'inverse (un slug sans mention textuelle) : la
 * curation a le droit d'ajouter ce que la source dit autrement.
 */
import type { FormerSovereign, SovereigntySnapshot } from "./data/types";

/** Formulations qui, dans le champ *Independence*, désignent une puissance tracée. */
const MENTIONS: ReadonlyArray<readonly [FormerSovereign, RegExp]> = [
  ["united_kingdom", /\bUK\b|Britain|British|England/i],
  ["france", /\bFrance\b|French/i],
  ["spain", /\bSpain\b|Spanish/i],
  ["portugal", /Portugal|Portuguese/i],
  ["netherlands", /Netherlands|Dutch/i],
  ["belgium", /Belgium|Belgian/i],
  ["united_states", /\bUS\b|United States/i],
  ["soviet_union", /Soviet|USSR/i],
  ["yugoslavia", /Yugoslav/i],
];

/**
 * Mentions volontairement non retenues, par pays. Chaque entrée dit pourquoi le
 * texte nomme la puissance sans que l'État en tire sa souveraineté — sinon la
 * garde n'aurait aucune valeur, il suffirait d'y verser tout ce qui échoue.
 */
const ACCEPTED_OMISSIONS: Readonly<
  Record<string, Readonly<Partial<Record<FormerSovereign, string>>>>
> = {
  // Auto-références : l'État se nomme lui-même dans sa propre notice.
  FRA: { france: "notice de la France, qui se nomme elle-même" },
  GBR: { united_kingdom: "notice du Royaume-Uni, qui se nomme lui-même" },
  PRT: {
    portugal: "notice du Portugal, qui se nomme lui-même",
    spain:
      "1640 = restauration après la domination espagnole, pas une décolonisation ; l'événement retenu est une refondation",
  },
  // Occupation quadripartite de 1945 : ni mandat, ni tutelle, ni indépendance.
  DEU: {
    united_kingdom:
      "zone d'occupation 1945-1949, pas une souveraineté antérieure",
    france: "zone d'occupation 1945-1949",
    united_states: "zone d'occupation 1945-1949",
    soviet_union: "zone d'occupation 1945-1949",
  },
  // Co-principauté toujours en vigueur : ce n'est pas un événement d'indépendance.
  AND: {
    france:
      "co-principauté (comte de Foix), régime actuel et non souveraineté antérieure",
    spain: "co-principauté (évêque d'Urgell)",
  },
  CUB: {
    united_states:
      "administration américaine 1898-1902 mentionnée en passant ; l'événement retenu rattache Cuba à l'Espagne",
  },
  OMN: {
    portugal:
      "« expulsion of the Portuguese » : fondation par expulsion, jamais une souveraineté portugaise sur l'Oman actuel",
  },
  SRB: {
    yugoslavia:
      "la Yougoslavie n'apparaît que dans les « notable earlier dates » ; l'événement de 2006 procède de l'Union d'État",
  },
  CAN: {
    united_states:
      "« North American colonies » : la mention est géographique, pas politique",
  },
};

/**
 * Renvoie une erreur par mention non retenue et non justifiée. Tableau vide =
 * dataset cohérent avec son texte source.
 */
export function validateSovereigntySources(
  snapshot: SovereigntySnapshot,
): string[] {
  const errors: string[] = [];
  Object.entries(snapshot.countries).forEach(([iso3, event]) => {
    const accepted = ACCEPTED_OMISSIONS[iso3] ?? {};
    MENTIONS.forEach(([slug, pattern]) => {
      if (!pattern.test(event.sourceDescription)) return;
      if (event.formerSovereigns.includes(slug)) return;
      if (accepted[slug]) return;
      errors.push(
        `${iso3}: sourceDescription nomme « ${slug} » sans le porter dans formerSovereigns — compléter la curation ou justifier l'omission`,
      );
    });
  });
  return errors;
}
