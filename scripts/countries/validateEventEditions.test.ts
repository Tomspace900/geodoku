import { describe, expect, it } from "vitest";
import { COUNTRY_CODES } from "../../content/countries/countryCodes";
import { COUNTRY_FACTS } from "../../content/countries/facts";
import type { CountryFacts } from "../../content/countries/type";
import { EVENT_EDITIONS } from "./data/eventEditions";
import type { EventEditionsSnapshot } from "./data/types";
import { validateEventEditions } from "./validateDatasetFacts";

const EMPTY: EventEditionsSnapshot = {
  checkedAt: "2026-10-13",
  events: {
    fifa_wc_host: [],
    summer_olympics_host: [],
    winter_olympics_host: [],
  },
};

function facts(
  events: CountryFacts["events"],
  eventEditions: CountryFacts["eventEditions"],
): CountryFacts {
  return { events, eventEditions } as unknown as CountryFacts;
}

describe("validateEventEditions", () => {
  it("accepte le snapshot committé", () => {
    expect(
      validateEventEditions(COUNTRY_FACTS, EVENT_EDITIONS, COUNTRY_CODES),
    ).toEqual([]);
  });

  it("arrête sur un événement sans aucune édition", () => {
    expect(
      validateEventEditions({ QAT: facts(["fifa_wc_host"], {}) }, EMPTY, [
        "QAT",
      ]),
    ).toEqual([
      expect.stringContaining("QAT: fifa_wc_host sans aucune édition"),
    ]);
  });

  it("arrête sur des années sans l'événement", () => {
    expect(
      validateEventEditions(
        { QAT: facts([], { fifa_wc_host: [2022] }) },
        EMPTY,
        ["QAT"],
      ),
    ).toEqual([
      expect.stringContaining("QAT: éditions de fifa_wc_host sans l'événement"),
    ]);
  });

  it("signale un hôte hors catalogue", () => {
    expect(
      validateEventEditions(
        {},
        {
          ...EMPTY,
          events: {
            ...EMPTY.events,
            fifa_wc_host: [{ year: 1966, hosts: ["ENG"] }],
          },
        },
        ["GBR"],
      ),
    ).toEqual(["fifa_wc_host 1966: hôte ENG hors catalogue"]);
  });
});
