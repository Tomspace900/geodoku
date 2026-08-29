import type { LocalizedString } from "../type";
import type { CountryCode } from "./countryCodes";

// ─── Identité joueur ─────────────────────────────────────────────────────────

/** Catalogue synchrone strictement limité à l'identité et à la recherche. */
export type Country = Readonly<{
  iso3: CountryCode;
  iso2: string;
  names: LocalizedString;
  aliases: readonly string[];
  flagEmoji: string;
}>;

export type CountryCatalog = readonly Country[];

// ─── Énumérations gameplay ───────────────────────────────────────────────────
// Migrées depuis `src/features/countries/types.ts`, qui les réexporte pour
// limiter le churn d'imports côté application.

export type Continent =
  | "africa"
  | "asia"
  | "europe"
  | "north_america"
  | "south_america"
  | "oceania";

export type WaterAccess = "landlocked" | "coastal" | "island";

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

export type CountryEvent =
  | "fifa_wc_host"
  | "summer_olympics_host"
  | "winter_olympics_host";

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
  | "indian_ocean_coast"
  | "arctic_coast";

// ─── Faits gameplay ─────────────────────────────────────────────────────────

/**
 * Faits d'un pays qui alimentent la dérivation des contraintes. Séparés de
 * l'identité (`Country`) : le bundle joueur ne charge que l'identité, les faits
 * ne servent qu'aux dérivations hors-ligne.
 */
export type CountryFacts = Readonly<{
  continent: Continent;
  waterAccess: WaterAccess;
  /** ISO3 des voisins ; peut contenir des territoires hors catalogue (ESH, HKG, MAC). */
  borders: readonly string[];
  areaKm2: number;
  population: number;
  /** ISO 639-1 (fallback 639-3 pour les langues sans code 639-1). */
  officialLanguages: readonly string[];
  /** Latitude du centre approximatif (world-countries latlng[0]). */
  latitude: number;
  /** Sous-région ONU (world-countries), ex. "Western Europe". */
  subregion: string;
  flagColors: readonly FlagColor[];
  flagSymbols: readonly FlagSymbol[];
  flagLayout: readonly FlagLayout[];
  events: readonly CountryEvent[];
  memberships: readonly PoliticalGroup[];
  capitals: readonly CountryCapital[];
  drivingSide: DrivingSide;
  /** Tags géo additionnels (ex. moyen-orient perçu ≠ Western Asia). */
  geoTags: readonly string[];
  regime: Regime;
  physicalFeatures: readonly PhysicalFeature[];
  /**
   * Nombre de décalages UTC civils **distincts** observés simultanément dans le
   * pays (IANA Time Zone Database). Toujours ≥ 1.
   */
  utcOffsetCount: number;
  /** Le pays compte au moins un volcan actif à l'Holocène (Smithsonian GVP). */
  hasHoloceneVolcano: boolean;
  /**
   * Part de territoire montagneux, fraction 0–1 (ODD 15.4.2, méthode
   * FAO/UNEP-WCMC). `null` quand la source ne couvre pas le pays — jamais 0.
   */
  mountainAreaShare: number | null;
  /**
   * Part de superficie forestière, fraction 0–1 (FAO FRA). `null` si non
   * couvert par la source — jamais 0.
   */
  forestCoverShare: number | null;
  /**
   * Nombre de centres urbains du pays dépassant strictement 1 M d'habitants
   * (GHSL Urban Centre Database). 0 quand aucun.
   */
  urbanCentresOver1M: number;
}>;

/**
 * Provenance légère : date/version globale du snapshot de faits. Pas d'objet
 * provenance par valeur — la documentation par famille de champs vit dans
 * `content/countries/SOURCE.md` (hors périmètre P1).
 */
export type CountryFactsSnapshot = Readonly<{
  date: string;
  note: string;
}>;

/**
 * Enregistrement pays complet et **mutable** — identité + faits + métriques de
 * popularité. Forme historique du `countries.json`, désormais produite en
 * mémoire par le pipeline de régénération offline (`scripts/countries/`) puis
 * éclatée en `catalog.ts` / `facts.ts` / `popularity.ts`. Aucun code runtime ne
 * la consomme.
 */
export type CountryRecord = {
  /** ISO3 « libre » : le pipeline manipule des chaînes brutes avant validation. */
  iso3: string;
  iso2: string;
  names: LocalizedString;
  aliases: string[];
  flagEmoji: string;
  continent: Continent;
  waterAccess: WaterAccess;
  borders: string[];
  areaKm2: number;
  population: number;
  officialLanguages: string[];
  wikipediaMonthlyViews?: number;
  popularityIndex?: number;
  latitude: number;
  subregion: string;
  flagColors: FlagColor[];
  flagSymbols: FlagSymbol[];
  flagLayout: FlagLayout[];
  events: CountryEvent[];
  memberships: PoliticalGroup[];
  capitals: CountryCapital[];
  drivingSide: DrivingSide;
  geoTags: string[];
  regime: Regime;
  physicalFeatures: PhysicalFeature[];
  utcOffsetCount: number;
  hasHoloceneVolcano: boolean;
  mountainAreaShare: number | null;
  forestCoverShare: number | null;
  urbanCentresOver1M: number;
};

// ─── Snapshot de popularité ─────────────────────────────────────────────────

export type CountryPopularityEntry = Readonly<{
  wikipediaTitle: string;
  rawPageviews: number | null;
  percentile: number;
  fallback: null | "legacy_raw_metric_not_persisted" | "pageviews_unavailable";
}>;

export type CountryPopularitySnapshot = Readonly<{
  schemaVersion: 1;
  snapshotId: string;
  measurementPeriod: Readonly<{
    startMonth: string;
    endMonth: string;
  }>;
  collectedAt: string;
  metric: "average_monthly_pageviews_all_access_user";
  algorithmVersion: string;
  fallbackPercentile: number;
  entries: Readonly<Partial<Record<CountryCode, CountryPopularityEntry>>>;
}>;
