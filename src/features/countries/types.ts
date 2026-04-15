export type Continent =
  | "africa"
  | "asia"
  | "europe"
  | "north_america"
  | "south_america"
  | "oceania";

export type WaterAccess = "landlocked" | "coastal" | "island";

export type LocalizedString = { fr: string; en: string };
export type LocalizedAliases = { fr: string[]; en: string[] };

export type Country = {
  code: string; // ISO 3166-1 alpha-3
  names: LocalizedString;
  aliases: LocalizedAliases;
  flagEmoji: string;
  continent: Continent;
  waterAccess: WaterAccess;
  borders: string[]; // ISO3 codes
  areaKm2: number;
  population: number;
  officialLanguages: string[]; // ISO 639-1 codes (639-3 fallback for languages without a 639-1 code)
};
