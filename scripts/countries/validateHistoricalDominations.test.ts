import { describe, expect, it } from "vitest";
import { COUNTRY_CODES } from "../../content/countries/countryCodes";
import { SOURCES } from "../../content/sources";
import { HISTORICAL_DOMINATIONS } from "./data/historicalDominations";
import type {
  DominationEntry,
  HistoricalDominationsSnapshot,
} from "./data/types";
import { validateHistoricalDominations } from "./validateDatasetFacts";

const SOURCE_IDS = Object.keys(SOURCES);

const COLONY: DominationEntry = {
  power: "united_kingdom",
  nature: "colony",
  from: 1819,
  to: 1963,
  reason: "Comptoir fondé en 1819.",
  sources: [{ id: "britannica", page: "/place/Singapore" }],
};

function snapshot(
  countries: HistoricalDominationsSnapshot["countries"],
  excluded: HistoricalDominationsSnapshot["excluded"] = {},
): HistoricalDominationsSnapshot {
  return { checkedAt: "2026-10-14", countries, excluded };
}

describe("validateHistoricalDominations", () => {
  it("accepte le dataset committé", () => {
    expect(
      validateHistoricalDominations(
        HISTORICAL_DOMINATIONS,
        COUNTRY_CODES,
        SOURCE_IDS,
      ),
    ).toEqual([]);
  });

  it("refuse deux périodes de la même puissance pour un pays", () => {
    expect(
      validateHistoricalDominations(
        snapshot({ SGP: [COLONY, { ...COLONY, from: 1946 }] }),
        ["SGP"],
        SOURCE_IDS,
      ),
    ).toEqual([
      "SGP: plusieurs dominations united_kingdom — n'en garder qu'une période",
    ]);
  });

  it("refuse une période qui finit avant de commencer", () => {
    expect(
      validateHistoricalDominations(
        snapshot({ SGP: [{ ...COLONY, from: 1970 }] }),
        ["SGP"],
        SOURCE_IDS,
      ),
    ).toEqual(["SGP (united_kingdom): période invalide (1970–1963)"]);
  });

  it("accepte un début inconnu, jamais estimé", () => {
    expect(
      validateHistoricalDominations(
        snapshot({ SGP: [{ ...COLONY, from: null }] }),
        ["SGP"],
        SOURCE_IDS,
      ),
    ).toEqual([]);
  });

  it("refuse une source absente de content/sources.ts", () => {
    expect(
      validateHistoricalDominations(
        snapshot({ SGP: [COLONY] }),
        ["SGP"],
        ["cia_factbook_background"],
      ),
    ).toEqual([
      "SGP (united_kingdom): source inconnue de content/sources.ts (britannica)",
    ]);
  });

  it("refuse un pays à la fois retenu et écarté pour la même puissance", () => {
    expect(
      validateHistoricalDominations(
        snapshot(
          { SGP: [COLONY] },
          {
            SGP: [
              {
                power: "united_kingdom",
                rules: ["partial_territory"],
                reason: "x",
              },
            ],
          },
        ),
        ["SGP"],
        SOURCE_IDS,
      ),
    ).toEqual(["SGP (united_kingdom): à la fois retenu et écarté"]);
  });

  it("refuse un pays hors catalogue", () => {
    expect(
      validateHistoricalDominations(
        snapshot({ ZZZ: [COLONY] }),
        ["SGP"],
        SOURCE_IDS,
      ),
    ).toEqual(["ZZZ: domination hors catalogue"]);
  });
});
