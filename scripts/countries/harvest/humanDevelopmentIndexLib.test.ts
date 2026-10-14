import { describe, expect, it } from "vitest";
import {
  buildSnapshot,
  decodeHdrCsv,
  editionVintageLabel,
  type HdrRow,
  parseCsv,
  readHdrRows,
  validateCategoryAgainstPublished,
} from "./humanDevelopmentIndexLib";

const row = (iso3: string, hdicode: string, hdi: string): HdrRow => ({
  iso3,
  hdicode,
  hdi,
});

describe("decodeHdrCsv", () => {
  it("décode le latin-1, pas l'UTF-8", () => {
    const bytes = new Uint8Array([0x43, 0xf4, 0x74, 0x65]); // « Côte »
    expect(decodeHdrCsv(bytes.buffer)).toBe("Côte");
  });
});

describe("parseCsv", () => {
  it("garde les virgules des champs entre guillemets", () => {
    expect(parseCsv('a,"Korea, Republic of",c\r\nd,e,f\n')).toEqual([
      ["a", "Korea, Republic of", "c"],
      ["d", "e", "f"],
    ]);
  });

  it("lit un guillemet échappé et un champ vide", () => {
    expect(parseCsv('"he said ""hi""",,x')).toEqual([
      ['he said "hi"', "", "x"],
    ]);
  });
});

describe("readHdrRows", () => {
  const header = ["iso3", "country", "hdicode", "hdi_2022", "hdi_2023"];

  it("lit l'IDH de la dernière année de l'édition", () => {
    expect(
      readHdrRows(
        [header, ["FRA", "France", "Very High", "0.91", "0.92"]],
        2023,
      ),
    ).toEqual([row("FRA", "Very High", "0.92")]);
  });

  it("refuse une édition plus récente que l'année épinglée", () => {
    expect(() =>
      readHdrRows(
        [
          [...header, "hdi_2024"],
          ["FRA", "", "", "", "", ""],
        ],
        2023,
      ),
    ).toThrow(/hdi_2024/);
  });

  it("refuse une colonne absente", () => {
    expect(() => readHdrRows([["iso3", "hdi_2023"]], 2023)).toThrow(/hdicode/);
  });

  it("refuse un ISO3 en double", () => {
    expect(() =>
      readHdrRows(
        [
          header,
          ["FRA", "", "High", "", "0.9"],
          ["FRA", "", "High", "", "0.9"],
        ],
        2023,
      ),
    ).toThrow(/FRA en double/);
  });
});

describe("buildSnapshot", () => {
  const rows = [
    row("FRA", "Very High", "0.92"),
    row("IND", "Medium", "0.685"),
    row("MCO", "Other Countries or Territories", ""),
    row("HKG", "Very High", "0.955"),
    row("ZZK.WORLD", "", "0.756"),
  ];

  it("range chaque pays du catalogue dans values ou missing, avec la cause", () => {
    const snapshot = buildSnapshot(
      rows,
      ["FRA", "IND", "MCO", "XKX"],
      "2026-10-09",
    );
    expect(snapshot.values).toEqual({
      FRA: { value: 0.92, category: "very_high" },
      IND: { value: 0.685, category: "medium" },
    });
    expect(snapshot.missing).toEqual({
      MCO: "no_value_published",
      XKX: "not_in_report",
    });
  });

  it("ignore les agrégats et les territoires hors catalogue", () => {
    const snapshot = buildSnapshot(rows, ["FRA"], "2026-10-09");
    expect(Object.keys(snapshot.values)).toEqual(["FRA"]);
  });

  it("refuse une ligne sans IDH hors « Other Countries or Territories »", () => {
    expect(() =>
      buildSnapshot([row("FRA", "Very High", "")], ["FRA"], "2026-10-09"),
    ).toThrow(/FRA/);
  });

  it("refuse une catégorie inconnue", () => {
    expect(() =>
      buildSnapshot([row("FRA", "Top", "0.92")], ["FRA"], "2026-10-09"),
    ).toThrow(/FRA/);
  });
});

describe("editionVintageLabel", () => {
  const snapshot = { edition: 2025, dataYear: 2023 };

  it("écrit l'édition et l'année des données dans les deux langues", () => {
    expect(editionVintageLabel(snapshot)).toEqual({
      fr: "Rapport 2025, données 2023",
      en: "2025 Report, 2023 data",
    });
  });
});

describe("validateCategoryAgainstPublished", () => {
  it("accepte une catégorie calculée égale à celle du PNUD", () => {
    expect(
      validateCategoryAgainstPublished({
        values: { FRA: { value: 0.92, category: "very_high" } },
      }),
    ).toEqual([]);
  });

  it("signale un écart (seuils périmés)", () => {
    expect(
      validateCategoryAgainstPublished({
        values: { CHN: { value: 0.797, category: "very_high" } },
      }),
    ).toEqual([expect.stringContaining("CHN")]);
  });
});
