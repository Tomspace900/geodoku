import { describe, expect, it } from "vitest";
import type { EventEditionsSnapshot } from "../countries/data/types";
import {
  asOfVintage,
  dateLabel,
  editionsHeldUntilVintage,
  lastEditionYear,
} from "./vintageLabels";

describe("dateLabel", () => {
  it("écrit « 1er » en français le premier du mois", () => {
    expect(dateLabel("2026-10-01")).toEqual({
      fr: "1er octobre 2026",
      en: "1 October 2026",
    });
  });

  it("refuse une date mal formée", () => {
    expect(() => dateLabel("14/10/2026")).toThrow(/YYYY-MM-DD/);
  });
});

describe("asOfVintage", () => {
  it("date l'état d'une donnée", () => {
    expect(asOfVintage("2026-10-14")).toEqual({
      fr: "au 14 octobre 2026",
      en: "as of 14 October 2026",
    });
  });
});

describe("editionsHeldUntilVintage", () => {
  it("nomme la dernière édition tenue", () => {
    expect(editionsHeldUntilVintage(2026)).toEqual({
      fr: "éditions tenues jusqu'en 2026",
      en: "editions held up to 2026",
    });
  });
});

describe("lastEditionYear", () => {
  const snapshot: EventEditionsSnapshot = {
    checkedAt: "2026-10-13",
    events: {
      fifa_wc_host: [{ year: 2022, hosts: ["QAT"] }],
      summer_olympics_host: [{ year: 2024, hosts: ["FRA"] }],
      winter_olympics_host: [{ year: 2026, hosts: ["ITA"] }],
    },
  };

  it("prend la plus récente des événements demandés, et eux seuls", () => {
    expect({
      fifa: lastEditionYear(snapshot, ["fifa_wc_host"]),
      olympics: lastEditionYear(snapshot, [
        "summer_olympics_host",
        "winter_olympics_host",
      ]),
    }).toEqual({ fifa: 2022, olympics: 2026 });
  });
});
