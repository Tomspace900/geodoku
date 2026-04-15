import type { en } from "./locales/en";

export type Translations = typeof en | typeof en;
export type Locale = "fr" | "en";

// Recursively generates all "dot-path" keys from the translations object.
// e.g. "ui.appName" | "constraint.continent_africa" | ...
type Path<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends object
    ? Path<T[K], `${P}${K}.`>
    : `${P}${K}`;
}[keyof T & string];

export type TKey = Path<Translations>;
