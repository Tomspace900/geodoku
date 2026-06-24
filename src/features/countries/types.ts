export type Continent =
  | "africa"
  | "asia"
  | "europe"
  | "north_america"
  | "south_america"
  | "oceania";

export type WaterAccess = "landlocked" | "coastal" | "island";

export type LocalizedString = { fr: string; en: string };

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
  | "plant";

/** Layout normalisé pour les contraintes de drapeau (dataset). */
export type FlagLayout = "vertical_stripes" | "horizontal_stripes";

export type CountryEvent = "fifa_wc_host" | "summer_olympics_host";

export type PoliticalGroup =
  | "arab_league"
  | "asean"
  | "brics"
  | "commonwealth"
  | "eu"
  | "eurozone"
  | "g20"
  | "g7"
  | "nato"
  | "oecd"
  | "opec"
  | "schengen"
  | "african_union";

export type DrivingSide = "left" | "right";

export type CapitalRole =
  | "administrative"
  | "constitutional"
  | "executive"
  | "judicial"
  | "legislative"
  | "primary";

export type CountryCapital = {
  name: string;
  latitude: number;
  longitude: number;
  roles: CapitalRole[];
};

/** Political regime type. Only two values to keep the axis simple and extensible. */
export type Regime = "monarchy" | "republic";

/** Notable physical-geography features used as gameplay constraints. */
export type PhysicalFeature =
  | "equator_crosser"
  | "mediterranean_coast"
  | "caribbean_coast"
  | "peak_over_5000m"
  | "has_desert"
  | "rainforest"
  | "atlantic_coast"
  | "pacific_coast"
  | "indian_ocean_coast";

export type Country = {
  iso3: string; // ISO 3166-1 alpha-3
  iso2: string; // ISO 3166-1 alpha-2
  names: LocalizedString;
  aliases: string[];
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
  /** Layout du drapeau (calibrage gameplay). */
  flagLayout: FlagLayout[];
  /** Événements sportifs majeurs (hôte). */
  events: CountryEvent[];
  /** Memberships politiques / économiques factuels exposés par REST Countries. */
  memberships: PoliticalGroup[];
  /** Capitales exposées par REST Countries, avec rôles quand disponibles. */
  capitals: CountryCapital[];
  /** Côté de conduite routière exposé par REST Countries. */
  drivingSide: DrivingSide;
  /** Tags géo additionnels (ex. moyen-orient perçu ≠ Western Asia). */
  geoTags: string[];
  /** Régime politique officiel (monarchie incluant royaumes constitutionnels et absolus). */
  regime: Regime;
  /** Traits géographiques physiques notables (façade maritime, pics, équateur…). */
  physicalFeatures: PhysicalFeature[];
};
