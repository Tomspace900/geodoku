import { describe, expect, it } from "vitest";
import type { WorldBankIndicator } from "../data/types";
import {
  buildIndicatorUrl,
  harvestWindow,
  parseWdiResponse,
  selectLatestValues,
  type WdiRow,
  yearRangeLabel,
} from "./worldBankIndicatorsLib";

const CODE = "NY.GDP.PCAP.CD";
const WINDOW = { from: 2021, to: 2025 };

const row = (iso3: string, date: number, value: number | null): WdiRow => ({
  indicator: { id: CODE },
  countryiso3code: iso3,
  date: String(date),
  value,
});

describe("harvestWindow", () => {
  it("couvre les cinq années révolues avant la récolte", () => {
    expect(harvestWindow("2026-10-09")).toEqual({ from: 2021, to: 2025 });
  });

  it("alimente l'URL de l'API", () => {
    expect(buildIndicatorUrl(CODE, WINDOW)).toBe(
      "https://api.worldbank.org/v2/country/all/indicator/NY.GDP.PCAP.CD?format=json&per_page=20000&date=2021:2025",
    );
  });
});

describe("parseWdiResponse", () => {
  it("lit le lastupdated et les lignes", () => {
    const page = parseWdiResponse(
      [{ pages: 1, lastupdated: "2026-10-08" }, [row("FRA", 2025, 1)]],
      CODE,
    );
    expect(page.lastUpdated).toBe("2026-10-08");
    expect(page.rows).toHaveLength(1);
  });

  it("refuse une réponse sur plusieurs pages", () => {
    expect(() =>
      parseWdiResponse([{ pages: 2, lastupdated: "2026-10-08" }, []], CODE),
    ).toThrow(/2 pages/);
  });

  it("refuse une ligne d'un autre indicateur", () => {
    const other: WdiRow = { ...row("FRA", 2025, 1), indicator: { id: "X" } };
    expect(() =>
      parseWdiResponse(
        [{ pages: 1, lastupdated: "2026-10-08" }, [other]],
        CODE,
      ),
    ).toThrow(/autre indicateur/);
  });

  it("refuse une réponse d'erreur", () => {
    expect(() =>
      parseWdiResponse([{ message: [{ id: "120" }] }], CODE),
    ).toThrow(/illisible/);
  });
});

describe("selectLatestValues", () => {
  const codes = ["CUB", "FRA", "TWN"];

  it("garde l'année non nulle la plus récente de la fenêtre", () => {
    const { values } = selectLatestValues(
      [row("FRA", 2023, 40), row("FRA", 2024, 45), row("FRA", 2025, null)],
      codes,
      WINDOW,
    );
    expect(values.FRA).toEqual({ value: 45, year: 2024 });
  });

  it("ignore une année hors fenêtre", () => {
    const { values, missing } = selectLatestValues(
      [row("FRA", 2019, 40)],
      codes,
      WINDOW,
    );
    expect(values.FRA).toBeUndefined();
    expect(missing.FRA).toBe("no_value_in_window");
  });

  it("distingue absent de la WDI et sans valeur récente", () => {
    const { missing } = selectLatestValues(
      [row("CUB", 2025, null)],
      codes,
      WINDOW,
    );
    expect(missing).toEqual({
      CUB: "no_value_in_window",
      FRA: "not_in_wdi",
      TWN: "not_in_wdi",
    });
  });

  it("écarte les agrégats régionaux", () => {
    const { values, missing } = selectLatestValues(
      [row("WLD", 2025, 13000), row("EUU", 2025, 40000)],
      codes,
      WINDOW,
    );
    expect(Object.keys({ ...values, ...missing }).sort()).toEqual(codes);
  });
});

describe("yearRangeLabel", () => {
  const indicator = (years: number[]): WorldBankIndicator => ({
    code: CODE,
    sourceUpdatedAt: "2026-10-08",
    window: WINDOW,
    values: Object.fromEntries(
      years.map((year, i) => [`C${i}`, { value: 1, year }]),
    ),
    missing: {},
  });

  it("écrit une plage avec un tiret demi-cadratin", () => {
    expect(yearRangeLabel(indicator([2022, 2025, 2024]))).toEqual({
      fr: "2022–2025",
      en: "2022–2025",
    });
  });

  it("écrit une seule année sans plage", () => {
    expect(yearRangeLabel(indicator([2024, 2024]))).toEqual({
      fr: "2024",
      en: "2024",
    });
  });

  it("refuse un indicateur vide", () => {
    expect(() => yearRangeLabel(indicator([]))).toThrow();
  });
});
