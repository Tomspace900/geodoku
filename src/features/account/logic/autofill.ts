/**
 * Le nom et la recherche du pays ne sont ni un identifiant ni une adresse :
 * `autoComplete="off"` ne suffit pas aux gestionnaires de mots de passe, qui
 * lisent chacun leur propre attribut (1Password, LastPass, Bitwarden,
 * Dashlane).
 */
export const NO_PASSWORD_MANAGER = {
  "data-1p-ignore": "true",
  "data-lpignore": "true",
  "data-bwignore": "true",
  "data-form-type": "other",
} as const;
