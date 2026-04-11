import data from "../../src/features/countries/data/countries.json";
// Copie de src/features/countries/data/countries.json — ne pas éditer ici, regénérer si la source change.
import type { Country } from "./types";

export const COUNTRIES: Country[] = data as unknown as Country[];
