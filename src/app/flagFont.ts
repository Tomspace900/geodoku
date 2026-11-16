/**
 * Police de substitution des drapeaux emoji (#51). Windows n'a aucun glyphe de
 * drapeau : sans elle, « 🇫🇷 » s'y affiche « FR ». `polyfillCountryFlagEmojis`
 * (`main.tsx`) ne la déclare que si le navigateur ne sait pas dessiner un
 * drapeau, et sa `unicode-range` la limite aux seuls caractères de drapeaux :
 * en tête des piles Tailwind, elle ne touche donc à aucun autre texte, et un
 * navigateur qui a ses propres drapeaux ne la télécharge jamais. Le fichier de
 * police (paquet `country-flag-emoji-polyfill`, Twemoji CC-BY 4.0, crédité
 * dans « À propos ») est servi par notre domaine via Vite.
 *
 * Fichier sans import : `tailwind.config.ts` le lit.
 */
export const FLAG_FONT_FAMILY = "Twemoji Country Flags";
