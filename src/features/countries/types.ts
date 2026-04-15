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

/** Couleurs normalisées pour les contraintes de drapeau (dataset). */
export type FlagColor =
  | "red"
  | "blue"
  | "green"
  | "yellow"
  | "white"
  | "black"
  | "orange";

/** Symboles normalisés pour les contraintes de drapeau (dataset). */
export type FlagSymbol =
  | "star"
  | "crescent"
  | "cross"
  | "sun"
  | "circle"
  | "triangle"
  | "animal"
  | "other";

export type CountryEvent = "fifa_wc_host" | "summer_olympics_host";

export type PoliticalGroup = "eu" | "g20";

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
  wikipediaMonthlyViews?: number;
  popularityIndex?: number; // 0..1 (higher = more well-known)
  /** Latitude du centre approximatif (world-countries latlng[0]). */
  latitude: number;
  /** Sous-région ONU (world-countries), ex. "Western Europe". */
  subregion: string;
  /** Couleurs dominantes du drapeau (calibrage gameplay). */
  flagColors: FlagColor[];
  /** Symboles notables du drapeau (calibrage gameplay). */
  flagSymbols: FlagSymbol[];
  /** Événements sportifs majeurs (hôte). */
  events: CountryEvent[];
  /** Regroupements politiques / économiques. */
  groups: PoliticalGroup[];
  /** Tags géo additionnels (ex. moyen-orient perçu ≠ Western Asia). */
  geoTags: string[];
};
