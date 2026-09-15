/**
 * Le modèle pays appartient à `content/` ; ce module n'existe que pour garder
 * l'import familier `@/features/countries/types` côté application, qui ne
 * consomme que l'identité joueur.
 *
 * Les scripts du pipeline contenu importent `content/countries/type`
 * directement : ils sont en **amont** de `content/`, passer par un module
 * `src/` inverserait le sens du graphe.
 */
export type { Country } from "../../../content/countries/type";
