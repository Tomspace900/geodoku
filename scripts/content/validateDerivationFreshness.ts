/**
 * Contrôle d'obsolescence : les `answers.ts` des contraintes **actives** doivent
 * être exactement ce que `DERIVATIONS` produit sur `COUNTRY_FACTS`.
 *
 * Pendant du `validateDatasetFacts` de l'étage du dessus (datasets → `facts.ts`).
 * Extrait de `check-content.ts` pour être testable des deux côtés : qu'il passe
 * sur le contenu committé, et qu'il **échoue** quand il doit échouer.
 *
 * Les 11 listes archivées sont figées à la main, hors de ce contrôle.
 */
import type {
  DERIVATIONS,
  DerivationContext,
} from "../../content/constraints/derivations";
import type { CountryCode } from "../../content/countries/countryCodes";
import type { CountryFacts } from "../../content/countries/type";

type ActiveId = keyof typeof DERIVATIONS;
type Derivations = Record<
  ActiveId,
  (facts: CountryFacts, ctx: DerivationContext) => boolean
>;

function sameValues(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

/**
 * Retourne une ligne par contrainte active dont la liste committée ne
 * correspond plus à sa dérivation — actionnable telle quelle dans un log de CI.
 */
export function validateDerivationFreshness(
  derivations: Derivations,
  factsByCode: Readonly<Record<string, CountryFacts>>,
  codes: readonly CountryCode[],
  committedAnswersFor: (id: ActiveId) => readonly CountryCode[],
): string[] {
  const ctx: DerivationContext = { factsOf: (code) => factsByCode[code] };

  return (Object.keys(derivations) as ActiveId[]).flatMap((id) => {
    const derived = codes.filter((code) =>
      derivations[id](factsByCode[code], ctx),
    );
    const committed = committedAnswersFor(id);
    if (sameValues(committed, derived)) return [];

    const added = derived.filter((code) => !committed.includes(code));
    const removed = committed.filter((code) => !derived.includes(code));
    return [
      `${id}: answers.ts obsolète (+[${added.join(",")}] -[${removed.join(",")}]) — lancer pnpm build:answers`,
    ];
  });
}
