export type Continent =
  | "africa"
  | "asia"
  | "europe"
  | "north_america"
  | "south_america"
  | "oceania";

export type Subregion =
  | "northern_africa"
  | "western_africa"
  | "middle_africa"
  | "eastern_africa"
  | "southern_africa"
  | "western_asia"
  | "central_asia"
  | "southern_asia"
  | "eastern_asia"
  | "southeastern_asia"
  | "northern_europe"
  | "western_europe"
  | "southern_europe"
  | "eastern_europe"
  | "central_america"
  | "caribbean"
  | "northern_america"
  | "south_america"
  | "australia_nz"
  | "melanesia"
  | "micronesia"
  | "polynesia";

export type WaterAccess = "landlocked" | "coastal" | "island";

export type Country = {
  code: string; // ISO 3166-1 alpha-3
  nameCanonical: string;
  aliases: string[];
  flagEmoji: string;
  continent: Continent;
  subregion: Subregion;
  hemispheres: ("north" | "south")[];
  waterAccess: WaterAccess;
  borders: string[]; // codes ISO3
  population: number;
  areaKm2: number;
  officialLanguages: string[]; // codes ISO 639-1
  notorietyIndex: number; // 0..1
};
