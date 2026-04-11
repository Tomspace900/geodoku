export type Continent =
  | "africa"
  | "asia"
  | "europe"
  | "north_america"
  | "south_america"
  | "oceania";

export type WaterAccess = "landlocked" | "coastal" | "island";

export type Country = {
  code: string; // ISO 3166-1 alpha-3
  nameCanonical: string;
  flagEmoji: string;
  continent: Continent;
  waterAccess: WaterAccess;
  borders: string[]; // codes ISO3
  areaKm2: number;
  population: number;
  officialLanguages: string[]; // ISO 639-1 codes (639-3 fallback for languages without a 639-1 code)
};
